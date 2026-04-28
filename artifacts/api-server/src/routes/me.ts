import { Router, type IRouter, type Request, type Response } from "express";
import { Types } from "mongoose";
import {
  User,
  ShopMember,
  Shop,
  KarmaEvent,
  PushToken,
  PUSH_PLATFORMS,
  type PushPlatform,
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

export default router;
