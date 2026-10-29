import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { Types } from "mongoose";
import { CatalogLike, Product, Service, Shop, User } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { isPublicShopKycAllowed } from "../lib/kyc-policy";

const router: IRouter = Router();
const validId = (id: string) => /^[a-f\d]{24}$/i.test(id) && Types.ObjectId.isValid(id);

// Must be mounted before routers with a blanket requireAuth middleware.
router.get("/public/catalog/:shopId/likes", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const shopId = String(req.params.shopId);
  if (!validId(shopId)) { res.status(400).json({ error: "Invalid shop id" }); return; }
  const shop = await Shop.findById(shopId).lean();
  if (!shop || !isPublicShopKycAllowed(shop.kyc?.status)) {
    res.status(404).json({ error: "Shop not found" }); return;
  }
  const auth = getAuth(req);
  const clerkId = (auth.sessionClaims?.userId as string | undefined) ?? auth.userId;
  const viewer = clerkId ? await User.findOne({ clerkUserId: clerkId }).select("_id").lean() : null;
  const [products, services] = await Promise.all([
    Product.find({ shop: shop._id, deletedAt: null }).select("_id").lean(),
    Service.find({ shop: shop._id, deletedAt: null, isActive: true }).select("_id").lean(),
  ]);
  const items = await CatalogLike.aggregate([
    { $match: { shop: shop._id, $or: [
      { kind: "product", item: { $in: products.map(p => p._id) } },
      { kind: "service", item: { $in: services.map(s => s._id) } },
    ] } },
    { $group: {
      _id: { kind: "$kind", item: "$item" },
      likeCount: { $sum: 1 },
      liked: { $max: { $cond: [{ $eq: ["$user", viewer?._id ?? null] }, 1, 0] } },
    } },
  ]);
  res.json({ items: items.map(row => ({
    id: String(row._id.item), kind: row._id.kind,
    likeCount: row.likeCount, likedByMe: row.liked === 1,
  })) });
});

router.put("/catalog/:kind/:itemId/like", requireAuth, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const kind = String(req.params.kind);
  const itemId = String(req.params.itemId);
  if ((kind !== "product" && kind !== "service") || !validId(itemId) || typeof req.body?.liked !== "boolean") {
    res.status(400).json({ error: "A valid product/service id and boolean liked are required" }); return;
  }
  const item = kind === "product"
    ? await Product.findOne({ _id: itemId, deletedAt: null }).select("shop").lean()
    : await Service.findOne({ _id: itemId, deletedAt: null, isActive: true }).select("shop").lean();
  const shop = item ? await Shop.findById(item.shop).lean() : null;
  if (!item || !shop || !isPublicShopKycAllowed(shop.kyc?.status)) {
    res.status(404).json({ error: "Item not found" }); return;
  }
  const target: { kind: "product" | "service"; item: Types.ObjectId } = { kind, item: new Types.ObjectId(itemId) };
  const vote = { ...target, user: new Types.ObjectId(req.userId) };
  if (req.body.liked) {
    await CatalogLike.init();
    try {
      await CatalogLike.updateOne(vote, { $setOnInsert: { ...vote, shop: shop._id } }, { upsert: true });
    } catch (error) {
      // A duplicate-key race means the same account's vote already exists.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  } else {
    await CatalogLike.deleteOne(vote);
  }
  const [likeCount, mine] = await Promise.all([
    CatalogLike.countDocuments(target), CatalogLike.exists(vote),
  ]);
  res.json({ id: itemId, kind, likeCount, likedByMe: !!mine });
});

export default router;
