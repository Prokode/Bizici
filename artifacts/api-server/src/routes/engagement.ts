import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { User, Shop, Category, ShopFavorite, AppNotification } from "@workspace/db";
import { SetMyInterestsBody, SetMyFavoriteShopBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { publicShopKycFilter } from "../lib/kyc-policy";

const router: IRouter = Router();
router.use("/me", requireAuth);
const oid = (id: unknown) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

router.get("/me/interests", async (req, res) => {
  const user = await User.findById(req.userId).select("interestCategoryIds interestsConfiguredAt").lean();
  res.json({ categoryIds: (user?.interestCategoryIds ?? []).map(String), configured: !!user?.interestsConfiguredAt });
});
router.put("/me/interests", async (req, res) => {
  const parsed = SetMyInterestsBody.safeParse(req.body);
  if (!parsed.success || parsed.data.categoryIds.some((id) => !oid(id))) {
    res.status(400).json({ error: "Select valid product or service categories (maximum 100)" }); return;
  }
  const ids = [...new Set(parsed.data.categoryIds)];
  const categories = await Category.countDocuments({ _id: { $in: ids }, kind: { $in: ["product", "service"] } });
  if (categories !== ids.length) {
    res.status(400).json({ error: "One or more categories no longer exist" }); return;
  }
  await User.updateOne({ _id: req.userId }, { $set: { interestCategoryIds: ids, interestsConfiguredAt: new Date() } });
  res.json({ categoryIds: ids, configured: true });
});
router.get("/me/favorites", async (req, res) => {
  const favorites = await ShopFavorite.find({ userId: req.userId }).sort({ createdAt: -1 })
    .populate({ path: "shopId", match: publicShopKycFilter(), select: "name kind countryCode brandPhotoUrl" }).lean();
  res.json(favorites.flatMap((favorite) => {
    const shop = favorite.shopId as any;
    return shop?.name ? [{
      shopId: String(shop._id), name: shop.name, kind: shop.kind ?? "products",
      countryCode: shop.countryCode ?? null, brandImageUrl: shop.brandPhotoUrl ?? null,
    }] : [];
  }));
});
router.put("/me/favorites/:shopId", async (req, res) => {
  const shopId = String(req.params.shopId);
  const parsed = SetMyFavoriteShopBody.safeParse(req.body);
  if (!oid(shopId) || !parsed.success) { res.status(400).json({ error: "Invalid favorite" }); return; }
  if (parsed.data.favorite) {
    if (!await Shop.exists({ _id: shopId, ...publicShopKycFilter() })) {
      res.status(404).json({ error: "Shop not found" }); return;
    }
    try {
      await ShopFavorite.updateOne({ userId: req.userId, shopId },
        { $setOnInsert: { userId: req.userId, shopId } }, { upsert: true });
    } catch (error) {
      // Concurrent identical PUTs are idempotent.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  } else {
    await ShopFavorite.deleteOne({ userId: req.userId, shopId });
  }
  res.json({ shopId, favorite: parsed.data.favorite });
});
router.get("/me/notifications", async (req, res) => {
  const before = req.query.before;
  if (before !== undefined && !oid(before)) { res.status(400).json({ error: "Invalid cursor" }); return; }
  const [items, unreadCount] = await Promise.all([
    AppNotification.find({ userId: req.userId, ...(before ? { _id: { $lt: new Types.ObjectId(String(before)) } } : {}) })
      .sort({ _id: -1 }).limit(51).lean(),
    AppNotification.countDocuments({ userId: req.userId, readAt: null }),
  ]);
  const page = items.slice(0, 50);
  res.json({
    items: page.map((n) => ({
      id: String(n._id), type: n.type, title: n.title, body: n.body, shopId: String(n.shopId),
      conversationId: n.conversationId ? String(n.conversationId) : null,
      itemId: n.itemId ? String(n.itemId) : null, itemKind: n.itemKind, action: n.action,
      readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString(),
    })),
    unreadCount, nextCursor: items.length > 50 ? String(page[page.length - 1]!._id) : null,
  });
});
router.post("/me/notifications/read-all", async (req, res) => {
  const now = new Date();
  await AppNotification.updateMany({ userId: req.userId, readAt: null, createdAt: { $lte: now } }, { $set: { readAt: now } });
  res.json({ success: true });
});
router.post("/me/notifications/:notificationId/read", async (req, res) => {
  if (!oid(req.params.notificationId)) { res.status(400).json({ error: "Invalid notification" }); return; }
  const result = await AppNotification.updateOne({ _id: req.params.notificationId, userId: req.userId },
    { $set: { readAt: new Date() } });
  if (!result.matchedCount) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ success: true });
});
export default router;
