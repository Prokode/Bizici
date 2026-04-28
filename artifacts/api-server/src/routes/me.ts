import { Router, type IRouter, type Request, type Response } from "express";
import { Types } from "mongoose";
import {
  User,
  ShopMember,
  Shop,
  Product,
  KarmaEvent,
  PushToken,
  PUSH_PLATFORMS,
  type PushPlatform,
  Basket,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeShop } from "../lib/serialize";

const router: IRouter = Router();

const WELCOME_BONUS_POINTS = 10;

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

/**
 * GET /api/me/karma
 *
 * Returns the signed-in customer's total Karma points plus their 10 most
 * recent events. Awards a one-time "welcome" bonus the first time the user
 * hits this endpoint so the Profile tab is never empty for a fresh account.
 */
router.get("/me/karma", requireAuth, async (req, res) => {
  const userObjectId = new Types.ObjectId(req.userId);

  const existing = await KarmaEvent.countDocuments({ userId: userObjectId });
  if (existing === 0) {
    await KarmaEvent.insertMany([
      {
        userId: userObjectId,
        kind: "welcome",
        points: WELCOME_BONUS_POINTS,
        note: "Bienvenue sur NearBuy !",
      },
    ]);
  }

  const [agg] = await KarmaEvent.aggregate<{ total: number }>([
    { $match: { userId: userObjectId } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);

  const recent = await KarmaEvent.find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    points: agg?.total ?? 0,
    recentEvents: recent.map((e) => ({
      id: String(e._id),
      kind: e.kind,
      points: e.points,
      note: e.note ?? null,
      createdAt:
        e.createdAt instanceof Date
          ? e.createdAt.toISOString()
          : new Date(e.createdAt as unknown as string).toISOString(),
    })),
  });
});

// ---- Push notification token registration --------------------------------
//
// Mobile apps register their Expo push token here once permission is granted
// and call DELETE on sign-out so we stop sending to dead devices.

router.post(
  "/me/push-tokens",
  requireAuth,
  async (req: Request, res: Response) => {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const platform = req.body?.platform as PushPlatform | undefined;
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    if (token.length > 200) {
      res.status(400).json({ error: "token is too long" });
      return;
    }
    if (
      !platform ||
      !PUSH_PLATFORMS.includes(platform as PushPlatform)
    ) {
      res.status(400).json({
        error: `platform must be one of: ${PUSH_PLATFORMS.join(", ")}`,
      });
      return;
    }
    const userOid = new Types.ObjectId(req.userId);
    // Refuse to take ownership of a token that already belongs to another
    // account — otherwise an authenticated attacker who learned someone
    // else's Expo push token (logs, MITM, leaked client) could hijack their
    // notifications by simply registering it under their own user. Legitimate
    // device handoffs (user A signs out, user B signs in on same device) work
    // because A's sign-out triggers DELETE before B registers.
    const existing = await PushToken.findOne({ expoPushToken: token })
      .select({ userId: 1 })
      .lean();
    if (existing && !existing.userId.equals(userOid)) {
      res
        .status(409)
        .json({ error: "Token already registered to another account" });
      return;
    }
    await PushToken.findOneAndUpdate(
      { expoPushToken: token },
      {
        $set: {
          userId: userOid,
          platform,
          lastSeenAt: new Date(),
        },
        $setOnInsert: { expoPushToken: token },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(204).end();
  },
);

router.delete(
  "/me/push-tokens",
  requireAuth,
  async (req: Request, res: Response) => {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    // Only delete if the token belongs to the current user — protects against
    // a malicious client unregistering someone else's device.
    await PushToken.deleteOne({
      expoPushToken: token,
      userId: new Types.ObjectId(req.userId),
    });
    res.status(204).end();
  },
);

// ---- Course basket ------------------------------------------------------
//
// "Course" = a bundle of free-text product queries the customer plans to look
// for in one shopping run. Saved as a singleton document per user. Starting a
// course resolves each query against the live product catalog and returns the
// nearest in-radius shop carrying a matching product, ordered by distance.

const MAX_BASKET_ITEMS = 30;
const COURSE_DEFAULT_RADIUS_KM = 5;
const COURSE_MAX_RADIUS_KM = 50;

function clampNum(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

type SerializedBasketItem = {
  id: string;
  query: string;
  addedAt: string;
};

function serializeBasket(
  doc: { items: { _id: Types.ObjectId; query: string; addedAt: Date }[] } | null,
): { items: SerializedBasketItem[] } {
  const items = (doc?.items ?? []).map((it) => ({
    id: String(it._id),
    query: it.query,
    addedAt:
      it.addedAt instanceof Date
        ? it.addedAt.toISOString()
        : new Date(it.addedAt as unknown as string).toISOString(),
  }));
  return { items };
}

router.get("/me/basket", requireAuth, async (req, res) => {
  const userOid = new Types.ObjectId(req.userId);
  const basket = await Basket.findOne({ userId: userOid }).lean();
  res.json(serializeBasket(basket));
});

router.post("/me/basket/items", requireAuth, async (req, res) => {
  const raw = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!raw) {
    res.status(400).json({ error: "query is required" });
    return;
  }
  if (raw.length > 120) {
    res.status(400).json({ error: "query is too long (max 120 chars)" });
    return;
  }

  const userOid = new Types.ObjectId(req.userId);
  let basket = await Basket.findOne({ userId: userOid });
  if (!basket) {
    basket = await Basket.create({ userId: userOid, items: [] });
  }

  // De-dup case-insensitively against existing items so users don't end up
  // with "lait" + "Lait " + "LAIT" stops in their course.
  const norm = raw.toLowerCase();
  const exists = basket.items.some((it) => it.query.toLowerCase() === norm);
  if (exists) {
    res.json(serializeBasket(basket.toObject()));
    return;
  }

  if (basket.items.length >= MAX_BASKET_ITEMS) {
    res.status(400).json({
      error: `Basket is full (max ${MAX_BASKET_ITEMS} items)`,
    });
    return;
  }

  basket.items.push({ query: raw, addedAt: new Date() });
  await basket.save();
  res.json(serializeBasket(basket.toObject()));
});

router.delete("/me/basket/items/:itemId", requireAuth, async (req, res) => {
  const itemId = String(req.params.itemId ?? "");
  if (!Types.ObjectId.isValid(itemId)) {
    res.status(400).json({ error: "invalid itemId" });
    return;
  }
  const userOid = new Types.ObjectId(req.userId);
  await Basket.updateOne(
    { userId: userOid },
    { $pull: { items: { _id: new Types.ObjectId(itemId) } } },
  );
  res.status(204).end();
});

router.post("/me/basket/clear", requireAuth, async (req, res) => {
  const userOid = new Types.ObjectId(req.userId);
  await Basket.updateOne(
    { userId: userOid },
    { $set: { items: [] } },
    { upsert: true },
  );
  res.status(204).end();
});

router.post(
  "/me/basket/start-course",
  requireAuth,
  async (req: Request, res: Response) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const radiusKm = clampNum(
      Number(req.body?.radiusKm ?? COURSE_DEFAULT_RADIUS_KM),
      0.5,
      COURSE_MAX_RADIUS_KM,
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat and lng are required numbers" });
      return;
    }

    const userOid = new Types.ObjectId(req.userId);
    const basket = await Basket.findOne({ userId: userOid }).lean();
    const items = basket?.items ?? [];

    if (items.length === 0) {
      res.json({ stops: [] });
      return;
    }

    // 1. Find shops in radius once. Re-used across all stops.
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

    const shopById = new Map(shopsInRadius.map((s) => [String(s._id), s]));
    const shopIds = shopsInRadius.map((s) => s._id);

    type Stop = {
      itemId: string;
      query: string;
      nearestShop: {
        id: string;
        name: string;
        marketName: string | null;
        latitude: number;
        longitude: number;
        isOpen: boolean;
        distanceMeters: number;
      } | null;
      products: {
        id: string;
        name: string;
        price: number;
        photo: string | null;
      }[];
    };

    const stops: Stop[] = await Promise.all(
      items.map(async (it) => {
        const itemId = String(it._id);
        const query = it.query;
        if (shopIds.length === 0) {
          return { itemId, query, nearestShop: null, products: [] };
        }

        // Match products in any in-radius shop whose name / brand /
        // description / tags matches the query. Same lenient regex strategy
        // as /public/search.
        const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
        const orClauses = [query, ...tokens].flatMap((t) => {
          const r = new RegExp(escapeRegex(t), "i");
          return [
            { name: r },
            { brand: r },
            { description: r },
            { tags: r },
          ];
        });

        const matches = await Product.find({
          shop: { $in: shopIds },
          deletedAt: null,
          quantity: { $gt: 0 },
          $or: orClauses,
        })
          .limit(50)
          .lean();

        if (matches.length === 0) {
          return { itemId, query, nearestShop: null, products: [] };
        }

        // Group products by shop, compute distance per shop, pick nearest.
        type Group = {
          shop: (typeof shopsInRadius)[number];
          dist: number;
          products: typeof matches;
        };
        const byShop = new Map<string, Group>();
        for (const p of matches) {
          const sIdStr = String(p.shop);
          const s = shopById.get(sIdStr);
          if (!s) continue;
          let g = byShop.get(sIdStr);
          if (!g) {
            const sLng = Number(s.location?.coordinates?.[0] ?? lng);
            const sLat = Number(s.location?.coordinates?.[1] ?? lat);
            g = {
              shop: s,
              dist: distanceMeters(lng, lat, sLng, sLat),
              products: [],
            };
            byShop.set(sIdStr, g);
          }
          g.products.push(p);
        }

        const grouped = Array.from(byShop.values()).sort(
          (a, b) => a.dist - b.dist,
        );
        const best = grouped[0];
        if (!best) {
          return { itemId, query, nearestShop: null, products: [] };
        }

        return {
          itemId,
          query,
          nearestShop: {
            id: String(best.shop._id),
            name: best.shop.name,
            marketName: best.shop.marketName ?? null,
            latitude: Number(best.shop.location?.coordinates?.[1] ?? 0),
            longitude: Number(best.shop.location?.coordinates?.[0] ?? 0),
            isOpen: !!best.shop.isOpen,
            distanceMeters: best.dist,
          },
          products: best.products.slice(0, 5).map((p) => ({
            id: String(p._id),
            name: p.name,
            price: Number(p.price ?? 0),
            photo: p.photos?.[0] ?? null,
          })),
        };
      }),
    );

    // Order stops by distance (resolved first, unresolved last).
    stops.sort((a, b) => {
      const da = a.nearestShop?.distanceMeters ?? Number.POSITIVE_INFINITY;
      const db = b.nearestShop?.distanceMeters ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

    res.json({ stops });
  },
);

export default router;
