import type { Request, Response } from "express";
import { publicShopKycFilter, isPublicShopKycAllowed } from "../lib/kyc-policy";
import { Types } from "mongoose";
import {
  Shop,
  Product,
  ShopReview,
  AccountDeletionRequest,
  ACCOUNT_DELETION_TYPES,
  type AccountDeletionType,
} from "@workspace/db";
import {
  serializeShop,
  serializeProduct,
  serializeReview,
} from "../lib/serialize";
import {
  parseVisualSearchImage,
  rankVisualCandidates,
} from "../lib/visualSearch";

function distanceMeters(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const radians = Math.PI / 180;
  const a =
    Math.sin(((toLat - fromLat) * radians) / 2) ** 2 +
    Math.cos(fromLat * radians) *
      Math.cos(toLat * radians) *
      Math.sin(((toLng - fromLng) * radians) / 2) ** 2;
  return Math.round(6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a))));
}

function productSearchShopFilter(
  lat: number,
  lng: number,
  radiusKm: number,
  expanded: boolean,
) {
  return {
    ...publicShopKycFilter(),
    ...(expanded ? { "location.type": "Point" as const } : {}),
    location: expanded
      ? {
          // A separate, unbounded-distance search, not a larger local radius.
          $not: { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6371.0088] } },
          $exists: true,
        }
      : {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000,
          },
        },
  };
}

function validSearchLocation(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Account deletion request rate limit (in-memory sliding window).
//
// Anyone (NearBuy customer or seller) can submit a request to have their
// account deleted from the marketing site. The map is bounded to
// MAX_TRACKED_IPS entries to prevent attackers from growing memory by
// rotating spoofed source IPs.
// ---------------------------------------------------------------------------

const RFC5322_EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DELETION_RATE_LIMIT_MAX = 5;
const DELETION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_IPS = 10_000;
const deletionAttempts = new Map<string, number[]>();

function pruneStaleAttempts(now: number): void {
  const cutoff = now - DELETION_RATE_LIMIT_WINDOW_MS;
  for (const [k, arr] of deletionAttempts) {
    if (arr.length === 0 || arr[arr.length - 1]! <= cutoff) {
      deletionAttempts.delete(k);
    }
  }
}

function rateLimitDeletion(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - DELETION_RATE_LIMIT_WINDOW_MS;

  const key = ip.length > 64 ? ip.slice(0, 64) : ip;

  if (deletionAttempts.size >= MAX_TRACKED_IPS) {
    pruneStaleAttempts(now);
    if (deletionAttempts.size >= MAX_TRACKED_IPS) {
      const firstKey = deletionAttempts.keys().next().value;
      if (firstKey !== undefined) deletionAttempts.delete(firstKey);
    }
  }

  const arr = (deletionAttempts.get(key) ?? []).filter((t) => t > cutoff);
  if (arr.length >= DELETION_RATE_LIMIT_MAX) {
    const oldest = arr[0]!;
    return {
      ok: false,
      retryAfter: Math.ceil(
        (oldest + DELETION_RATE_LIMIT_WINDOW_MS - now) / 1000,
      ),
    };
  }
  arr.push(now);
  deletionAttempts.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

export const publicController = {
  listShops: async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = clamp(Number(req.query.radiusKm ?? 5), 0.1, 50);
    const limit = clamp(Number(req.query.limit ?? 200), 1, 500);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat and lng query params are required" });
      return;
    }

    const shops = await Shop.find({
      ...publicShopKycFilter(),
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
  },

  /**
   * Text + geo search across all in-stock products. We use case-insensitive
   * regex on name / brand / description. Explicit scope=all searches outside
   * radiusKm with no distance cap; cursors cover the entire matching catalog.
   * The mobile client adds Fuse.js fuzzy re-ranking on top to tolerate typos.
   */
  search: async (req: Request, res: Response) => {
    const q = String(req.query.q ?? "").trim();
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = clamp(Number(req.query.radiusKm ?? 5), 0.1, 400);
    const limit = clamp(Number(req.query.limit ?? 60), 1, 200);
    const expanded = req.query.scope === "all";
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";

    if (!q) {
      res.json({ products: [], count: 0, nextCursor: null, fuzzyFallback: false });
      return;
    }
    if (!validSearchLocation(lat, lng) || !Number.isFinite(radiusKm) ||
        !Number.isFinite(limit) || (cursor && !Types.ObjectId.isValid(cursor))) {
      res.status(400).json({ error: "Invalid search location, radius, limit, or cursor" });
      return;
    }

    const shopsInRadius = await Shop.find(
      productSearchShopFilter(lat, lng, radiusKm, expanded),
    )
      .select("_id name marketName location isOpen currency")
      .lean();

    if (shopsInRadius.length === 0) {
      res.json({ products: [], count: 0, nextCursor: null, fuzzyFallback: false });
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

    const productFilter = {
      shop: { $in: shopIds },
      deletedAt: null,
      quantity: { $gt: 0 },
      ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
    };
    let products = await Product.find({
      ...productFilter,
      $or: orClauses,
    })
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const fuzzyFallback = products.length === 0 && !expanded && !cursor;
    if (fuzzyFallback) {
      // Fallback pool — return everything in radius so the client can fuzzy match
      products = await Product.find({
        ...productFilter,
      })
        .sort({ _id: -1 })
        .limit(limit)
        .lean();
    }
    const hasMore = !fuzzyFallback && products.length > limit;
    products = products.slice(0, limit);
    const nextCursor = hasMore ? String(products[products.length - 1]!._id) : null;

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
        currency: s ? serializeShop(s).currency : null,
        photo: p.photos?.[0] ?? null,
        distanceMeters: distanceMeters(lng, lat, sLng, sLat),
      };
    });

    // Stable order: distance asc (Fuse.js will re-rank by relevance client-side)
    result.sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({ products: result, count: result.length, nextCursor, fuzzyFallback });
  },

  /** Compare product photos in bounded batches; cursors cover every eligible product. */
  visualSearch: async (req: Request, res: Response) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const radiusKm = clamp(Number(req.body?.radiusKm ?? 5), 0.1, 50);
    const expanded = req.body?.scope === "all";
    const cursor = typeof req.body?.cursor === "string" ? req.body.cursor : "";
    const hintRaw =
      typeof req.body?.hint === "string" ? req.body.hint.trim() : "";

    if (!validSearchLocation(lat, lng) || !Number.isFinite(radiusKm) ||
        (cursor && !Types.ObjectId.isValid(cursor))) {
      res.status(400).json({ error: "Invalid search location, radius, or cursor" });
      return;
    }
    const parsedImage = parseVisualSearchImage(
      req.body?.imageBase64,
      req.body?.imageMimeType,
    );
    if (!parsedImage.ok) {
      res.status(parsedImage.status).json({ error: parsedImage.error });
      return;
    }

    const shopsInRadius = await Shop.find(
      productSearchShopFilter(lat, lng, radiusKm, expanded),
    )
      .select("_id name marketName location isOpen currency")
      .lean();

    if (shopsInRadius.length === 0) {
      res.json({ matches: [], count: 0, nextCursor: null });
      return;
    }

    const shopById = new Map(shopsInRadius.map((s) => [String(s._id), s]));
    const shopIds = shopsInRadius.map((s) => s._id);
    const productPage = await Product.find({
      shop: { $in: shopIds },
      deletedAt: null,
      quantity: { $gt: 0 },
      photos: { $exists: true, $ne: [] },
      ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
    })
      .select("_id shop name brand description price photos")
      .sort({ _id: -1 })
      .limit(25)
      .lean();
    const products = productPage.slice(0, 24);
    const nextCursor = productPage.length > 24
      ? String(products[products.length - 1]!._id)
      : null;

    const imageCandidates = products.flatMap((product) => {
      const photo = product.photos?.[0];
      if (typeof photo !== "string" || !photo.trim()) return [];
      return [{ id: String(product._id), photo: photo.trim() }];
    });
    if (imageCandidates.length === 0) {
      res.json({ matches: [], count: 0, nextCursor });
      return;
    }

    let visualScores;
    try {
      visualScores = await rankVisualCandidates(
        parsedImage.image,
        imageCandidates,
        hintRaw || undefined,
      );
    } catch (error) {
      req.log.error({ err: error }, "Visual product matching failed");
      res.status(502).json({ error: "Visual search is temporarily unavailable" });
      return;
    }

    const productById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const matches = visualScores.flatMap(({ id, confidence }) => {
      const product = productById.get(id);
      if (!product) return [];
      const s = shopById.get(String(product.shop));
      const sLng = Number(s?.location?.coordinates?.[0] ?? lng);
      const sLat = Number(s?.location?.coordinates?.[1] ?? lat);
      return {
        id,
        shopId: String(product.shop),
        shopName: s?.name ?? "",
        shopMarketName: s?.marketName ?? null,
        shopIsOpen: s?.isOpen ?? false,
        name: product.name,
        brand: product.brand ?? null,
        description: product.description ?? null,
        price: Number(product.price ?? 0),
        currency: s ? serializeShop(s).currency : null,
        photo: product.photos?.[0] ?? null,
        distanceMeters: distanceMeters(lng, lat, sLng, sLat),
        confidence: Math.round(confidence * 100) / 100,
      };
    });

    res.json({ matches, count: matches.length, nextCursor });
  },

  getShop: async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.shopId).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    // Keep detail access consistent with map/search visibility.
    if (!isPublicShopKycAllowed(shop.kyc?.status)) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    const products = await Product.find({
      shop: shop._id,
      deletedAt: null,
    })
      .populate("categories")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      shop: serializeShop(shop),
      products: products.map(serializeProduct),
    });
  },

  /**
   * Public, paginated list of reviews for a shop. Sorted newest first. Cursor
   * is the ISO timestamp of the last item from the previous page (`before`).
   *
   * Anyone — including signed-out visitors — can read reviews to make a buying
   * decision; only writes require authentication (see /api/me/reviews/:shopId).
   */
  listShopReviews: async (req: Request, res: Response) => {
    const { shopId } = req.params;
    if (typeof shopId !== "string" || !Types.ObjectId.isValid(shopId)) {
      res.status(400).json({ error: "invalid shopId" });
      return;
    }

    const shop = await Shop.findOne({
      _id: new Types.ObjectId(shopId),
      ...publicShopKycFilter(),
    })
      .select("_id")
      .lean();
    if (!shop) {
      res.status(404).json({ error: "shop not found" });
      return;
    }

    const limit = clamp(Number(req.query.limit ?? 20), 1, 50);
    const beforeRaw =
      typeof req.query.before === "string" ? req.query.before : undefined;
    const beforeDate = beforeRaw ? new Date(beforeRaw) : null;

    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId),
    };
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
      filter.createdAt = { $lt: beforeDate };
    }

    const reviews = await ShopReview.find(filter)
      .populate("customerUserId", "name")
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = reviews.length > limit;
    const page = hasMore ? reviews.slice(0, limit) : reviews;
    const nextCursor =
      hasMore && page.length > 0
        ? (page[page.length - 1] as any).createdAt.toISOString()
        : null;

    res.json({
      reviews: page.map(serializeReview),
      nextCursor,
    });
  },

  createAccountDeletionRequest: async (req: Request, res: Response) => {
    // `req.ip` is parsed from `x-forwarded-for` only because we configured
    // `app.set("trust proxy", 1)` to trust exactly one hop (the Replit edge
    // proxy). This prevents a remote attacker from spoofing their address by
    // injecting their own forwarded-for header through an untrusted hop.
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    const limit = rateLimitDeletion(ip);
    if (!limit.ok) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      res
        .status(429)
        .json({ error: "Trop de demandes. Réessayez plus tard." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const accountTypeRaw =
      typeof body.accountType === "string" ? body.accountType : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const confirmed = body.confirmed === true;

    if (!fullName || fullName.length < 2 || fullName.length > 200) {
      res
        .status(400)
        .json({ error: "Nom complet requis (2 à 200 caractères)." });
      return;
    }
    if (!email || email.length > 320 || !RFC5322_EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Adresse e-mail invalide." });
      return;
    }
    if (
      !ACCOUNT_DELETION_TYPES.includes(accountTypeRaw as AccountDeletionType)
    ) {
      res.status(400).json({
        error: "Type de compte invalide (attendu: customer, seller ou both).",
      });
      return;
    }
    if (reason.length > 2000) {
      res
        .status(400)
        .json({ error: "Motif trop long (2000 caractères maximum)." });
      return;
    }
    if (!confirmed) {
      res.status(400).json({
        error:
          "Vous devez confirmer que vous avez compris les conséquences de la suppression.",
      });
      return;
    }

    const userAgent = (req.headers["user-agent"] as string | undefined)?.slice(
      0,
      500,
    );

    const created = await AccountDeletionRequest.create({
      fullName,
      email,
      accountType: accountTypeRaw as AccountDeletionType,
      reason,
      confirmed,
      sourceIp: ip,
      userAgent: userAgent ?? null,
    });

    res.status(201).json({
      id: String(created._id),
      receivedAt: created.createdAt,
      message:
        "Votre demande a bien été enregistrée. Notre équipe la traitera sous 30 jours et vous contactera à l'adresse indiquée.",
    });
  },
};
