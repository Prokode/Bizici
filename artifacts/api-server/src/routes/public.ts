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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Text + geo search across all in-stock products. We use case-insensitive
 * regex on name / brand / description, scoped to shops within radiusKm.
 * The mobile client adds Fuse.js fuzzy re-ranking on top to tolerate typos.
 */
router.get("/public/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = clamp(Number(req.query.radiusKm ?? 5), 0.1, 50);
  const limit = clamp(Number(req.query.limit ?? 60), 1, 200);

  if (!q) {
    res.json({ products: [], count: 0 });
    return;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng query params are required" });
    return;
  }

  // 1. Find shops in radius
  const shopsInRadius = await Shop.find({
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .select("_id name marketName location isOpen")
    .lean();

  if (shopsInRadius.length === 0) {
    res.json({ products: [], count: 0 });
    return;
  }

  const shopById = new Map(shopsInRadius.map((s) => [String(s._id), s]));
  const shopIds = shopsInRadius.map((s) => s._id);

  // 2. Build a lenient OR regex across name / brand / description / tags.
  // We do an initial "strict" regex pass; if that returns nothing we fall
  // back to the full radius pool so Fuse.js on the client can fuzzy-match
  // typos (e.g. "jeen" → "jean").
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const orClauses = [q, ...tokens].flatMap((t) => {
    const r = new RegExp(escapeRegex(t), "i");
    return [
      { name: r },
      { brand: r },
      { description: r },
      { tags: r },
      { category: r },
    ];
  });

  let products = await Product.find({
    shop: { $in: shopIds },
    deletedAt: null,
    quantity: { $gt: 0 },
    $or: orClauses,
  })
    .limit(limit)
    .lean();

  if (products.length === 0) {
    // Fallback pool — return everything in radius so the client can fuzzy match
    products = await Product.find({
      shop: { $in: shopIds },
      deletedAt: null,
      quantity: { $gt: 0 },
    })
      .limit(limit)
      .lean();
  }

  const result = products.map((p) => {
    const s = shopById.get(String(p.shop));
    const sLng = Number(s?.location?.coordinates?.[0] ?? lng);
    const sLat = Number(s?.location?.coordinates?.[1] ?? lat);
    return {
      id: String(p._id),
      shopId: String(p.shop),
      shopName: s?.name ?? "",
      shopMarketName: s?.marketName ?? null,
      shopIsOpen: s?.isOpen ?? false,
      name: p.name,
      brand: p.brand ?? null,
      description: p.description ?? null,
      price: Number(p.price ?? 0),
      photo: p.photos?.[0] ?? null,
      distanceMeters: distanceMeters(lng, lat, sLng, sLat),
    };
  });

  // Stable order: distance asc (Fuse.js will re-rank by relevance client-side)
  result.sort((a, b) => a.distanceMeters - b.distanceMeters);

  res.json({ products: result, count: result.length });
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
