import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import {
  db,
  shopsTable,
  shopMembersTable,
  productsTable,
  broadcastRequestsTable,
} from "@workspace/db";
import {
  CreateShopBody,
  UpdateShopBody,
  SetShopOpenBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireShopAccess,
  requireSeller,
  type ShopAccess,
} from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

const lonExpr = (col: any) => sql<number>`ST_X(${col}::geometry)`;
const latExpr = (col: any) => sql<number>`ST_Y(${col}::geometry)`;
const pointSql = (lat: number, lng: number) =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

interface ShopRow {
  id: string;
  sellerId: string;
  name: string;
  marketName: string | null;
  stallInfo: string | null;
  isOpen: boolean | null;
  latitude: number;
  longitude: number;
}

function serializeShop(s: ShopRow) {
  return {
    id: s.id,
    sellerId: s.sellerId,
    name: s.name,
    marketName: s.marketName,
    stallInfo: s.stallInfo,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    isOpen: s.isOpen ?? true,
  };
}

async function findShopById(id: string): Promise<ShopRow | null> {
  const rows = await db
    .select({
      id: shopsTable.id,
      sellerId: shopsTable.sellerId,
      name: shopsTable.name,
      marketName: shopsTable.marketName,
      stallInfo: shopsTable.stallInfo,
      isOpen: shopsTable.isOpen,
      latitude: latExpr(shopsTable.location).as("latitude"),
      longitude: lonExpr(shopsTable.location).as("longitude"),
    })
    .from(shopsTable)
    .where(eq(shopsTable.id, id))
    .limit(1);
  return (rows[0] as ShopRow) ?? null;
}

const DEMO_QUERIES = [
  "Looking for fresh coriander",
  "Need AA batteries urgently",
  "Anyone selling cold mineral water?",
  "Where can I find phone chargers?",
  "Need a notebook and pen",
  "Looking for ripe mangoes",
  "Anyone has umbrellas?",
  "Need a hair clip and rubber bands",
];

function offsetLatLng(
  lat: number,
  lng: number,
  meters: number,
  bearing: number,
) {
  const R = 6378137;
  const brng = (bearing * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(meters / R) +
      Math.cos(lat1) * Math.sin(meters / R) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(meters / R) * Math.cos(lat1),
      Math.cos(meters / R) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

async function seedDemoRequests(shopLat: number, shopLng: number) {
  const picks = [...DEMO_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
  for (const query of picks) {
    const meters = 200 + Math.random() * 1800;
    const bearing = Math.random() * 360;
    const { lat, lng } = offsetLatLng(shopLat, shopLng, meters, bearing);
    await db.execute(sql`
      INSERT INTO broadcast_requests (query, location, status)
      VALUES (${query}, ${pointSql(lat, lng)}, 'active')
    `);
  }
}

// ─── List user's shops ──────────────────────────────────────────────
router.get("/shops", async (req, res) => {
  const rows = await db.execute<{
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
  res.json(
    (rows.rows as any[]).map((r) => ({
      role: r.role,
      shop: serializeShop(r as ShopRow),
    })),
  );
});

// ─── Create new shop (current user becomes seller) ──────────────────
router.post("/shops", async (req, res) => {
  const body = CreateShopBody.parse(req.body);
  const inserted = await db
    .insert(shopsTable)
    .values({
      sellerId: req.userId,
      name: body.name,
      location: { latitude: body.latitude, longitude: body.longitude },
      marketName: body.marketName ?? null,
      stallInfo: body.stallInfo ?? null,
    })
    .returning({ id: shopsTable.id });
  const shopId = inserted[0]!.id;
  await db
    .insert(shopMembersTable)
    .values({ shopId, userId: req.userId, role: "seller" });
  await seedDemoRequests(body.latitude, body.longitude);
  const shop = await findShopById(shopId);
  res.json(serializeShop(shop!));
});

// ─── Shop-scoped routes (require access) ────────────────────────────
router.get("/shops/:shopId", requireShopAccess, async (req, res) => {
  const shop = await findShopById((req.params.shopId as string));
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  res.json(serializeShop(shop));
});

router.put("/shops/:shopId", requireShopAccess, requireSeller, async (req, res) => {
  const body = UpdateShopBody.parse(req.body);
  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.marketName !== undefined) updates.marketName = body.marketName;
  if (body.stallInfo !== undefined) updates.stallInfo = body.stallInfo;
  if (body.latitude !== undefined && body.longitude !== undefined) {
    updates.location = { latitude: body.latitude, longitude: body.longitude };
  }
  if (Object.keys(updates).length > 0) {
    await db
      .update(shopsTable)
      .set(updates)
      .where(eq(shopsTable.id, (req.params.shopId as string)));
  }
  const shop = await findShopById((req.params.shopId as string));
  res.json(serializeShop(shop!));
});

router.patch("/shops/:shopId/open", requireShopAccess, async (req, res) => {
  const body = SetShopOpenBody.parse(req.body);
  await db
    .update(shopsTable)
    .set({ isOpen: body.isOpen })
    .where(eq(shopsTable.id, (req.params.shopId as string)));
  const shop = await findShopById((req.params.shopId as string));
  res.json(serializeShop(shop!));
});

router.get("/shops/:shopId/qr", requireShopAccess, async (req, res) => {
  const shop = await findShopById((req.params.shopId as string));
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  const domain = process.env["REPLIT_DEV_DOMAIN"] || "nearbuy.app";
  const url = `https://${domain}/c/${shop.id}`;
  res.json({ url, token: shop.id });
});

router.get("/shops/:shopId/summary", requireShopAccess, async (req, res) => {
  const shop = await findShopById((req.params.shopId as string));
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  const counts = await db
    .select({
      total: sql<number>`count(*)::int`,
      inStock: sql<number>`sum(case when ${productsTable.stockStatus} = 'in_stock' then 1 else 0 end)::int`,
    })
    .from(productsTable)
    .where(eq(productsTable.shopId, shop.id));

  const total = counts[0]?.total ?? 0;
  const inStock = counts[0]?.inStock ?? 0;

  const reqRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(broadcastRequestsTable)
    .where(
      and(
        eq(broadcastRequestsTable.status, "active"),
        sql`ST_DWithin(${broadcastRequestsTable.location}, ${pointSql(shop.latitude, shop.longitude)}, 5000)`,
      ),
    );

  res.json({
    totalProducts: total,
    inStockCount: inStock,
    outOfStockCount: total - inStock,
    activeRequestsCount: reqRows[0]?.count ?? 0,
  });
});

export default router;
