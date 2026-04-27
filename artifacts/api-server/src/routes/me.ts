import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { User, ShopMember, Shop } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeShop } from "../lib/serialize";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const memberships = await ShopMember.find({
    userId: new Types.ObjectId(req.userId),
  }).lean();

  const shopIds = memberships.map((m) => m.shopId);
  const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
  const shopMap = new Map(shops.map((s) => [String(s._id), s]));

  const shopsWithRole = memberships
    .map((m) => {
      const shop = shopMap.get(String(m.shopId));
      if (!shop) return null;
      return {
        shop: serializeShop(shop),
        role: m.role as "seller" | "sub_seller",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  res.json({
    id: String(user._id),
    email: user.email ?? null,
    name: user.name ?? null,
    shops: shopsWithRole,
  });
});

export default router;
