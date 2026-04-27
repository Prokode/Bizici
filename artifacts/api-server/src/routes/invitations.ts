import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { ShopInvitation, ShopMember, User, Shop } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeShop } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/invitations", async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user?.email) {
    res.json([]);
    return;
  }
  const invs = await ShopInvitation.find({
    email: user.email.toLowerCase(),
    acceptedAt: null,
  })
    .populate("shopId")
    .populate("createdBy")
    .lean();

  res.json(
    invs.map((i: any) => ({
      token: i.token,
      shopId: String(i.shopId?._id ?? i.shopId),
      shopName: i.shopId?.name ?? "Unknown shop",
      role: i.role as "seller" | "sub_seller",
      invitedByName: i.createdBy?.name ?? i.createdBy?.email ?? null,
    })),
  );
});

router.post("/invitations/:token/accept", async (req, res) => {
  const token = String(req.params.token);
  const user = await User.findById(req.userId).lean();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const inv = await ShopInvitation.findOne({ token, acceptedAt: null }).lean();
  if (!inv) {
    res.status(404).json({ error: "Invitation not found or already accepted" });
    return;
  }
  if (user.email && inv.email.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: "Invitation is for a different email" });
    return;
  }

  // Upsert membership
  await ShopMember.updateOne(
    {
      shopId: inv.shopId,
      userId: new Types.ObjectId(req.userId),
    },
    {
      $setOnInsert: {
        shopId: inv.shopId,
        userId: new Types.ObjectId(req.userId),
        role: inv.role,
      },
    },
    { upsert: true },
  );

  await ShopInvitation.updateOne(
    { _id: inv._id },
    { $set: { acceptedAt: new Date() } },
  );

  const shop = await Shop.findById(inv.shopId).lean();
  if (!shop) {
    res.status(404).json({ error: "Shop no longer exists" });
    return;
  }
  res.json({ shop: serializeShop(shop), role: inv.role });
});

export default router;
