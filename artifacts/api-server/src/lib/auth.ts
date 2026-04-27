import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { User, ShopMember, type ShopMemberDoc } from "@workspace/db";
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      clerkUserId: string;
      shopAccess?: ShopAccess;
    }
  }
}

export type ShopAccess = {
  shopId: string;
  role: "seller" | "sub_seller";
};

export async function ensureUserRow(clerkUserId: string): Promise<string> {
  let email: string | null = null;
  let name: string | null = null;
  try {
    const u = await clerkClient.users.getUser(clerkUserId);
    email =
      u.primaryEmailAddress?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      null;
    const fn = u.firstName ?? "";
    const ln = u.lastName ?? "";
    name = fn || ln ? `${fn} ${ln}`.trim() : (u.username ?? null);
  } catch {
    // ignore — Clerk might not be reachable in some test paths
  }

  const user = await User.findOneAndUpdate(
    { clerkUserId },
    {
      $setOnInsert: { clerkUserId },
      $set: {
        ...(email !== null ? { email } : {}),
        ...(name !== null ? { name } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return String(user!._id);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth = getAuth(req);
    const clerkUserId =
      (auth?.sessionClaims?.userId as string | undefined) ??
      auth?.userId ??
      undefined;
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.clerkUserId = clerkUserId;
    req.userId = await ensureUserRow(clerkUserId);
    next();
  } catch (err) {
    next(err);
  }
}

export async function getShopAccess(
  userId: string,
  shopId: string,
): Promise<ShopAccess | null> {
  if (!Types.ObjectId.isValid(shopId)) return null;
  const member = await ShopMember.findOne({
    shopId: new Types.ObjectId(shopId),
    userId: new Types.ObjectId(userId),
  }).lean<ShopMemberDoc | null>();
  if (!member) return null;
  return { shopId, role: member.role as "seller" | "sub_seller" };
}

export async function requireShopAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const shopId = req.params.shopId as string | undefined;
  if (!shopId) {
    res.status(400).json({ error: "Missing shopId in path" });
    return;
  }
  const access = await getShopAccess(req.userId, shopId);
  if (!access) {
    res.status(403).json({ error: "You do not have access to this shop" });
    return;
  }
  req.shopAccess = access;
  next();
}

export function requireSeller(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const access = req.shopAccess;
  if (!access || access.role !== "seller") {
    res
      .status(403)
      .json({ error: "Only the shop's seller can perform this action" });
    return;
  }
  next();
}
