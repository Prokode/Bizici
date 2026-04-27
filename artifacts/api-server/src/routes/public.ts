import express, { Router, type IRouter } from "express";
import { Shop, Product } from "@workspace/db";
import { serializeShop, serializeProduct } from "../lib/serialize";

const router: IRouter = Router();

// Larger body parser used ONLY by the visual-search route below so we can
// accept a base64-encoded photo without widening the global 100kb limit
// across the whole API surface.
const visualSearchBodyParser = express.json({ limit: "10mb" });

// Hard cap on the raw imageBase64 string length to keep memory/CPU bounded
// even when the request slips through under the 10MB body limit. ~8 MB
// base64 ≈ 6 MB raw image, generous for any reasonable phone photo.
const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024;

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

/**
 * Visual search stub. The customer sends a captured photo (base64 data URL or
 * raw base64) and we pretend to match it against in-stock products around
 * their location. Real vision ML is out of scope for the MVP — we return up to
 * 6 in-radius products as plausible visual matches with a fake confidence
 * score, optionally biased by a `hint` text the user can attach.
 *
 * Body: { lat, lng, radiusKm?, imageBase64?, hint? }
 * Response: { matches: VisualMatch[], count, mocked: true }
 */
router.post("/public/visual-search", visualSearchBodyParser, async (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const radiusKm = clamp(Number(req.body?.radiusKm ?? 5), 0.1, 50);
  const limit = clamp(Number(req.body?.limit ?? 6), 1, 20);
  const hintRaw = typeof req.body?.hint === "string" ? req.body.hint.trim() : "";
  const imageBase64 = req.body?.imageBase64;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }
  if (
    typeof imageBase64 === "string" &&
    imageBase64.length > MAX_IMAGE_BASE64_LENGTH
  ) {
    res.status(413).json({
      error: `imageBase64 exceeds ${MAX_IMAGE_BASE64_LENGTH} bytes`,
    });
    return;
  }

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
    res.json({ matches: [], count: 0, mocked: true });
    return;
  }

  const shopById = new Map(shopsInRadius.map((s) => [String(s._id), s]));
  const shopIds = shopsInRadius.map((s) => s._id);

  // If the user attached a hint ("chaussure marron"), prefer products
  // matching it; otherwise pull the full radius pool and shuffle.
  type ProductFilter = Record<string, unknown>;
  const baseFilter: ProductFilter = {
    shop: { $in: shopIds },
    deletedAt: null,
    quantity: { $gt: 0 },
  };

  // Two separate pools so the hint matches always rank above the random
  // fillers — otherwise the deterministic shuffle below would interleave
  // them and bury the user's intent.
  const hintMatches = hintRaw
    ? await Product.find({
        ...baseFilter,
        $or: [
          { name: new RegExp(escapeRegex(hintRaw), "i") },
          { brand: new RegExp(escapeRegex(hintRaw), "i") },
          { description: new RegExp(escapeRegex(hintRaw), "i") },
          { tags: new RegExp(escapeRegex(hintRaw), "i") },
          { category: new RegExp(escapeRegex(hintRaw), "i") },
        ],
      })
        .limit(limit * 3)
        .lean()
    : [];

  let fillers: typeof hintMatches = [];
  if (hintMatches.length < limit) {
    // Top up with random in-radius products so we always return something
    // believable when the hint is missing or under-matches.
    const seen = new Set(hintMatches.map((p) => String(p._id)));
    const candidates = await Product.find(baseFilter).limit(limit * 4).lean();
    for (const p of candidates) {
      if (!seen.has(String(p._id))) {
        fillers.push(p);
        seen.add(String(p._id));
        if (fillers.length + hintMatches.length >= limit * 3) break;
      }
    }
  }

  // Deterministic-feeling shuffle seeded by lat+lng so refreshing the same
  // location returns a stable order (nicer UX than pure randomness). We
  // hash the full _id (sum of all char codes) instead of just the first
  // character so different products don't cluster together. Matches and
  // fillers are shuffled INDEPENDENTLY then concatenated so hint priority
  // is preserved.
  const seed = Math.floor((Math.abs(lat) * 1e4 + Math.abs(lng) * 1e4) % 9973);
  const idHash = (id: string): number => {
    let h = seed;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) % 9973;
    }
    return h;
  };
  const shuffleByHash = <T extends { _id: unknown }>(arr: T[]): T[] =>
    [...arr].sort(
      (a, b) => idHash(String(a._id)) - idHash(String(b._id)),
    );

  const top = [
    ...shuffleByHash(hintMatches),
    ...shuffleByHash(fillers),
  ].slice(0, limit);

  // Confidence: monotonically decreasing from ~92% down, with slight jitter.
  const matches = top.map((p, i) => {
    const s = shopById.get(String(p.shop));
    const sLng = Number(s?.location?.coordinates?.[0] ?? lng);
    const sLat = Number(s?.location?.coordinates?.[1] ?? lat);
    const baseConf = 0.92 - i * 0.07;
    const jitter = ((String(p._id).charCodeAt(2) || 0) % 5) / 100;
    const confidence = Math.max(0.4, Math.min(0.99, baseConf - jitter));
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
      confidence: Math.round(confidence * 100) / 100,
    };
  });

  res.json({ matches, count: matches.length, mocked: true });
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
