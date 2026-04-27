import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { Shop, ShopMember, BroadcastRequest, Product } from "@workspace/db";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { serializeShop } from "../lib/serialize";
import crypto from "node:crypto";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/shops", async (req, res) => {
  const memberships = await ShopMember.find({
    userId: new Types.ObjectId(req.userId),
  }).lean();
  const shopIds = memberships.map((m) => m.shopId);
  const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
  const shopMap = new Map(shops.map((s) => [String(s._id), s]));
  res.json(
    memberships
      .map((m) => {
        const shop = shopMap.get(String(m.shopId));
        if (!shop) return null;
        return { shop: serializeShop(shop), role: m.role };
      })
      .filter((x) => x !== null),
  );
});

router.post("/shops", async (req, res) => {
  const { name, marketName, stallInfo, latitude, longitude } = req.body ?? {};
  if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "name, latitude, longitude required" });
    return;
  }

  const shop = await Shop.create({
    sellerId: new Types.ObjectId(req.userId),
    name,
    marketName: marketName ?? null,
    stallInfo: stallInfo ?? null,
    location: { type: "Point", coordinates: [longitude, latitude] },
    isOpen: true,
  });

  await ShopMember.create({
    shopId: shop._id,
    userId: new Types.ObjectId(req.userId),
    role: "seller",
  });

  // Seed 4 demo broadcast requests within 200-2000m if this is the user's first shop
  const totalShops = await ShopMember.countDocuments({
    userId: new Types.ObjectId(req.userId),
  });
  if (totalShops === 1) {
    const demos = ["Tomates fraîches", "Pain", "Eau minérale", "Ampoules LED"].map(
      (q) => {
        const r = 200 + Math.random() * 1800; // meters
        const theta = Math.random() * 2 * Math.PI;
        const dx = (r * Math.cos(theta)) / 111_320; // ~deg lng (rough)
        const dy = (r * Math.sin(theta)) / 110_540; // ~deg lat (rough)
        return {
          userId: null,
          query: q,
          status: "active" as const,
          location: {
            type: "Point" as const,
            coordinates: [longitude + dx, latitude + dy],
          },
        };
      },
    );
    await BroadcastRequest.insertMany(demos);
  }

  res.json(serializeShop(shop.toObject()));
});

router.get("/shops/:shopId", requireShopAccess, async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).lean();
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  res.json(serializeShop(shop));
});

router.put(
  "/shops/:shopId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    const { name, marketName, stallInfo, latitude, longitude } = req.body ?? {};
    const update: any = {};
    if (typeof name === "string") update.name = name;
    if (marketName !== undefined) update.marketName = marketName;
    if (stallInfo !== undefined) update.stallInfo = stallInfo;
    if (typeof latitude === "number" && typeof longitude === "number") {
      update.location = { type: "Point", coordinates: [longitude, latitude] };
    }
    const shop = await Shop.findByIdAndUpdate(req.params.shopId, update, {
      new: true,
    }).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(serializeShop(shop));
  },
);

router.patch("/shops/:shopId/open", requireShopAccess, async (req, res) => {
  const isOpen = !!req.body?.isOpen;
  const shop = await Shop.findByIdAndUpdate(
    req.params.shopId,
    { isOpen },
    { new: true },
  ).lean();
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  res.json(serializeShop(shop));
});

router.get("/shops/:shopId/qr", requireShopAccess, async (req, res) => {
  const token = crypto
    .createHash("sha256")
    .update(`${req.params.shopId}:${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 16);
  const url = `nearbuy://shop/${req.params.shopId}?t=${token}`;
  res.json({ url, token });
});

router.get("/shops/:shopId/summary", requireShopAccess, async (req, res) => {
  const shopObjectId = new Types.ObjectId(req.params.shopId);
  const [totalProducts, inStockCount, outOfStockCount, shop] = await Promise.all([
    Product.countDocuments({ shop: shopObjectId, deletedAt: null }),
    Product.countDocuments({
      shop: shopObjectId,
      deletedAt: null,
      stockStatus: "in_stock",
    }),
    Product.countDocuments({
      shop: shopObjectId,
      deletedAt: null,
      stockStatus: "out_of_stock",
    }),
    Shop.findById(req.params.shopId).lean(),
  ]);

  let activeRequestsCount = 0;
  if (shop) {
    activeRequestsCount = await BroadcastRequest.countDocuments({
      status: "active",
      location: {
        $nearSphere: {
          $geometry: shop.location as any,
          $maxDistance: 5000,
        },
      },
    });
  }

  res.json({
    totalProducts,
    inStockCount,
    outOfStockCount,
    activeRequestsCount,
  });
});

export default router;
