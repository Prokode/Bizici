import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, shopMembersTable } from "@workspace/db/schema";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      clerkUserId: string;
    }
  }
}

export async function ensureUserRow(clerkUserId: string): Promise<string> {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]) return existing[0].id;

  let email: string | null = null;
  let name: string | null = null;
  try {
    const u = await clerkClient.users.getUser(clerkUserId);
    email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
    const fn = u.firstName ?? "";
    const ln = u.lastName ?? "";
    name = (fn || ln) ? `${fn} ${ln}`.trim() : (u.username ?? null);
  } catch {
    // ignore — Clerk might not be reachable in some test paths
  }

  const inserted = await db
    .insert(usersTable)
    .values({ clerkUserId, email, name })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { email: sql`COALESCE(EXCLUDED.email, users.email)`, updatedAt: sql`now()` },
    })
    .returning({ id: usersTable.id });

  return inserted[0].id;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.sessionClaims?.userId as string | undefined ?? auth?.userId ?? undefined;
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

export type ShopAccess = {
  shopId: string;
  role: "seller" | "sub_seller";
};

export async function getShopAccess(
  userId: string,
  shopId: string,
): Promise<ShopAccess | null> {
  const rows = await db
    .select({ role: shopMembersTable.role })
    .from(shopMembersTable)
    .where(
      and(
        eq(shopMembersTable.shopId, shopId),
        eq(shopMembersTable.userId, userId),
      ),
    )
    .limit(1);
  if (!rows[0]) return null;
  return { shopId, role: rows[0].role as "seller" | "sub_seller" };
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
  (req as any).shopAccess = access;
  next();
}

export function requireSeller(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const access = (req as any).shopAccess as ShopAccess | undefined;
  if (!access || access.role !== "seller") {
    res
      .status(403)
      .json({ error: "Only the shop's seller can perform this action" });
    return;
  }
  next();
}
