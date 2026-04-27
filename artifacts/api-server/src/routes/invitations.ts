import { Router, type IRouter } from "express";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  db,
  shopInvitationsTable,
  shopMembersTable,
  shopsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/invitations", async (req, res) => {
  const userRows = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId))
    .limit(1);
  const email = userRows[0]?.email?.toLowerCase();
  if (!email) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      token: shopInvitationsTable.token,
      shopId: shopInvitationsTable.shopId,
      role: shopInvitationsTable.role,
      shopName: shopsTable.name,
      invitedByName: usersTable.name,
    })
    .from(shopInvitationsTable)
    .leftJoin(shopsTable, eq(shopsTable.id, shopInvitationsTable.shopId))
    .leftJoin(usersTable, eq(usersTable.id, shopInvitationsTable.invitedBy))
    .where(
      and(
        eq(shopInvitationsTable.email, email),
        isNull(shopInvitationsTable.acceptedAt),
      ),
    );

  res.json(
    rows.map((r) => ({
      token: r.token,
      shopId: r.shopId,
      shopName: r.shopName ?? "Shop",
      role: r.role as "seller" | "sub_seller",
      invitedByName: r.invitedByName,
    })),
  );
});

router.post("/invitations/:token/accept", async (req, res) => {
  const token = (req.params.token as string);

  const userRows = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId))
    .limit(1);
  const email = userRows[0]?.email?.toLowerCase();
  if (!email) {
    res.status(400).json({ error: "Your account has no email address" });
    return;
  }

  const inviteRows = await db
    .select()
    .from(shopInvitationsTable)
    .where(
      and(
        eq(shopInvitationsTable.token, token),
        isNull(shopInvitationsTable.acceptedAt),
      ),
    )
    .limit(1);
  const invite = inviteRows[0];
  if (!invite) {
    res
      .status(404)
      .json({ error: "Invitation not found or already accepted" });
    return;
  }
  if (invite.email.toLowerCase() !== email) {
    res.status(403).json({
      error: "This invitation was sent to a different email address",
    });
    return;
  }

  await db
    .insert(shopMembersTable)
    .values({ shopId: invite.shopId, userId: req.userId, role: invite.role })
    .onConflictDoNothing();
  await db
    .update(shopInvitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(shopInvitationsTable.id, invite.id));

  const shopRows = await db.execute<{
    id: string;
    sellerId: string;
    name: string;
    marketName: string | null;
    stallInfo: string | null;
    isOpen: boolean | null;
    latitude: number;
    longitude: number;
  }>(sql`
    SELECT
      id,
      seller_id AS "sellerId",
      name,
      market_name AS "marketName",
      stall_info AS "stallInfo",
      is_open AS "isOpen",
      ST_Y(location::geometry) AS latitude,
      ST_X(location::geometry) AS longitude
    FROM shops
    WHERE id = ${invite.shopId}
  `);
  const shop = (shopRows.rows as any[])[0];
  res.json({
    role: invite.role,
    shop: {
      id: shop.id,
      sellerId: shop.sellerId,
      name: shop.name,
      marketName: shop.marketName,
      stallInfo: shop.stallInfo,
      latitude: Number(shop.latitude),
      longitude: Number(shop.longitude),
      isOpen: shop.isOpen ?? true,
    },
  });
});

export default router;
