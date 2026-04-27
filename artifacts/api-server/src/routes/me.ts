import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const userRows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId))
    .limit(1);
  const user = userRows[0]!;

  const shopRows = await db.execute<{
    id: string;
    sellerId: string;
    name: string;
    marketName: string | null;
    stallInfo: string | null;
    isOpen: boolean | null;
    latitude: number;
    longitude: number;
    role: "seller" | "sub_seller";
  }>(sql`
    SELECT
      s.id,
      s.seller_id AS "sellerId",
      s.name,
      s.market_name AS "marketName",
      s.stall_info AS "stallInfo",
      s.is_open AS "isOpen",
      ST_Y(s.location::geometry) AS latitude,
      ST_X(s.location::geometry) AS longitude,
      m.role
    FROM shop_members m
    JOIN shops s ON s.id = m.shop_id
    WHERE m.user_id = ${req.userId}
    ORDER BY s.created_at ASC
  `);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    shops: (shopRows.rows as any[]).map((s) => ({
      role: s.role,
      shop: {
        id: s.id,
        sellerId: s.sellerId,
        name: s.name,
        marketName: s.marketName,
        stallInfo: s.stallInfo,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        isOpen: s.isOpen ?? true,
      },
    })),
  });
});

export default router;
