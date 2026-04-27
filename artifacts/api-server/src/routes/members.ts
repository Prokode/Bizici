import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import crypto from "node:crypto";
import { ShopMember, ShopInvitation, User } from "@workspace/db";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { serializeInvitation } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/shops/:shopId/members", requireShopAccess, async (req, res) => {
  const shopObjectId = new Types.ObjectId(req.params.shopId);
  const memberships = await ShopMember.find({ shopId: shopObjectId })
    .populate("userId")
    .lean();

  const members = memberships.map((m) => {
    const u: any = m.userId;
    return {
      id: String(m._id),
      userId: String(u?._id ?? m.userId),
      email: u?.email ?? null,
      name: u?.name ?? null,
      role: m.role as "seller" | "sub_seller",
      createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date()).toISOString(),
    };
  });

  const invitations = await ShopInvitation.find({
    shopId: shopObjectId,
    acceptedAt: null,
  }).lean();

  res.json({
    members,
    invitations: invitations.map(serializeInvitation),
  });
});

router.post(
  "/shops/:shopId/members/invite",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }

    // If user already exists & is already a member, reject
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      const already = await ShopMember.findOne({
        shopId: new Types.ObjectId(req.params.shopId),
        userId: existingUser._id,
      }).lean();
      if (already) {
        res.status(409).json({ error: "User is already a member of this shop" });
        return;
      }
    }

    // If a pending invite exists for this email+shop, return it
    const existing = await ShopInvitation.findOne({
      shopId: new Types.ObjectId(req.params.shopId),
      email,
      acceptedAt: null,
    }).lean();
    if (existing) {
      res.json(serializeInvitation(existing));
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const inv = await ShopInvitation.create({
      shopId: new Types.ObjectId(req.params.shopId),
      email,
      role: "sub_seller",
      token,
      createdBy: new Types.ObjectId(req.userId),
    });

    res.json(serializeInvitation(inv.toObject()));
  },
);

router.delete(
  "/shops/:shopId/members/:userId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.userId)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    // Don't let seller remove themselves with this endpoint
    if (req.params.userId === req.userId) {
      res.status(400).json({ error: "Sellers cannot remove themselves" });
      return;
    }
    const r = await ShopMember.deleteOne({
      shopId: new Types.ObjectId(req.params.shopId),
      userId: new Types.ObjectId(req.params.userId),
      role: "sub_seller",
    });
    res.json({ success: r.deletedCount > 0 });
  },
);

router.delete(
  "/shops/:shopId/invitations/:invitationId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.invitationId)) {
      res.status(400).json({ error: "Invalid invitationId" });
      return;
    }
    const r = await ShopInvitation.deleteOne({
      _id: new Types.ObjectId(req.params.invitationId),
      shopId: new Types.ObjectId(req.params.shopId),
      acceptedAt: null,
    });
    res.json({ success: r.deletedCount > 0 });
  },
);

export default router;
