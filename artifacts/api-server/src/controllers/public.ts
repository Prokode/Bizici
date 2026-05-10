import type { Request, Response } from "express";
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

// Hard cap on the raw imageBase64 string length to keep memory/CPU bounded
// even when the request slips through under the 10MB body limit. ~8 MB
// base64 ≈ 6 MB raw image, generous for any reasonable phone photo.
const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024;

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
      // Only KYC-approved shops are visible to customers on the map.
      "kyc.status": "approved",
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
   * regex on name / brand / description, scoped to shops within radiusKm.
   * The mobile client adds Fuse.js fuzzy re-ranking on top to tolerate typos.
   */
  search: async (req: Request, res: Response) => {
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

    // 1. Find shops in radius (KYC-approved only — non-validated shops are
    //    invisible to customers in product search).
    const shopsInRadius = await Shop.find({
      "kyc.status": "approved",
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
  },

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
  visualSearch: async (req: Request, res: Response) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const radiusKm = clamp(Number(req.body?.radiusKm ?? 5), 0.1, 50);
    const limit = clamp(Number(req.body?.limit ?? 6), 1, 20);
    const hintRaw =
      typeof req.body?.hint === "string" ? req.body.hint.trim() : "";
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
      "kyc.status": "approved",
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
      const candidates = await Product.find(baseFilter)
        .limit(limit * 4)
        .lean();
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
      [...arr].sort((a, b) => idHash(String(a._id)) - idHash(String(b._id)));

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
  },

  getShop: async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.shopId).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    // Hide non-approved shops from customer-facing detail too — otherwise a
    // direct deep link could bypass the map filter.
    if ((shop.kyc?.status ?? "unsubmitted") !== "approved") {
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
      "kyc.status": "approved",
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
