import { Router, type IRouter } from "express";
import { Shop, Product } from "@workspace/db";
import { serializeShop, serializeProduct } from "../lib/serialize";

const router: IRouter = Router();

/**
 * Public, unauthenticated endpoints used by the customer (NearBuy) app.
 * Auth is intentionally NOT required — anyone can browse open shops on the map.
 */

function distanceMeters(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const dx = (toLng - fromLng) * 111_320 * Math.cos((fromLat * Math.PI) / 180);
  const dy = (toLat - fromLat) * 110_540;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

router.get("/public/shops", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = clamp(Number(req.query.radiusKm ?? 5), 0.1, 50);
  const limit = clamp(Number(req.query.limit ?? 200), 1, 500);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng query params are required" });
    return;
  }

  const shops = await Shop.find({
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(limit)
    .lean();

  const shopIds = shops.map((s) => s._id);

  // Pull a couple of in-stock products per shop so each marker can show a
  // live product count + small preview list.
  const products = await Product.find({
    shop: { $in: shopIds },
    deletedAt: null,
    quantity: { $gt: 0 },
  })
    .select("name shop photos price")
    .lean();

  const productsByShop = new Map<string, typeof products>();
  for (const p of products) {
    const sid = String(p.shop);
    const arr = productsByShop.get(sid) ?? [];
    arr.push(p);
    productsByShop.set(sid, arr);
  }

  const result = shops.map((s) => {
    const sLng = Number(s.location?.coordinates?.[0] ?? 0);
    const sLat = Number(s.location?.coordinates?.[1] ?? 0);
    const shopProducts = productsByShop.get(String(s._id)) ?? [];
    return {
      ...serializeShop(s),
      distanceMeters: distanceMeters(lng, lat, sLng, sLat),
      productCount: shopProducts.length,
      previewProducts: shopProducts.slice(0, 4).map((p) => ({
        id: String(p._id),
        name: p.name,
        price: Number(p.price ?? 0),
        photo: p.photos?.[0] ?? null,
      })),
    };
  });

  res.json({ shops: result, count: result.length });
});

router.get("/public/shops/:shopId", async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).lean();
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const products = await Product.find({
    shop: shop._id,
    deletedAt: null,
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.json({
    shop: serializeShop(shop),
    products: products.map(serializeProduct),
  });
});

export default router;
