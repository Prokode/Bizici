import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  shopsTable,
  productsTable,
  broadcastRequestsTable,
} from "@workspace/db";
import { UpsertShopBody, SetShopOpenBody } from "@workspace/api-zod";
import { requireOwnerId } from "../lib/owner";

const router: IRouter = Router();
router.use(requireOwnerId);

const lonExpr = (col: any) => sql<number>`ST_X(${col}::geometry)`;
const latExpr = (col: any) => sql<number>`ST_Y(${col}::geometry)`;
const pointSql = (lat: number, lng: number) =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

interface ShopRow {
  id: string;
  ownerId: string | null;
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
    ownerId: s.ownerId,
    name: s.name,
    marketName: s.marketName,
    stallInfo: s.stallInfo,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    isOpen: s.isOpen ?? true,
  };
}

async function findShopByOwner(ownerId: string): Promise<ShopRow | null> {
  const rows = await db
    .select({
      id: shopsTable.id,
      ownerId: shopsTable.ownerId,
      name: shopsTable.name,
      marketName: shopsTable.marketName,
      stallInfo: shopsTable.stallInfo,
      isOpen: shopsTable.isOpen,
      latitude: latExpr(shopsTable.location).as("latitude"),
      longitude: lonExpr(shopsTable.location).as("longitude"),
    })
    .from(shopsTable)
    .where(eq(shopsTable.ownerId, ownerId))
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

function offsetLatLng(lat: number, lng: number, meters: number, bearing: number) {
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

router.get("/shop", async (req, res) => {
  const shop = await findShopByOwner(req.ownerId);
  res.json(shop ? serializeShop(shop) : null);
});

router.put("/shop", async (req, res) => {
  const body = UpsertShopBody.parse(req.body);
  const existing = await findShopByOwner(req.ownerId);

  if (!existing) {
    await db.execute(sql`
      INSERT INTO shops (owner_id, name, location, market_name, stall_info)
      VALUES (
        ${req.ownerId},
        ${body.name},
        ${pointSql(body.latitude, body.longitude)},
        ${body.marketName ?? null},
        ${body.stallInfo ?? null}
      )
    `);
    await seedDemoRequests(body.latitude, body.longitude);
  } else {
    await db.execute(sql`
      UPDATE shops
      SET name = ${body.name},
          location = ${pointSql(body.latitude, body.longitude)},
          market_name = ${body.marketName ?? null},
          stall_info = ${body.stallInfo ?? null}
      WHERE id = ${existing.id}
    `);
  }

  const shop = await findShopByOwner(req.ownerId);
  res.json(serializeShop(shop!));
});

router.patch("/shop/open", async (req, res) => {
  const body = SetShopOpenBody.parse(req.body);
  const existing = await findShopByOwner(req.ownerId);
  if (!existing) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  await db
    .update(shopsTable)
    .set({ isOpen: body.isOpen })
    .where(eq(shopsTable.id, existing.id));
  const shop = await findShopByOwner(req.ownerId);
  res.json(serializeShop(shop!));
});

router.get("/shop/qr", async (req, res) => {
  const shop = await findShopByOwner(req.ownerId);
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  const domain = process.env["REPLIT_DEV_DOMAIN"] || "nearbuy.app";
  const url = `https://${domain}/c/${shop.id}`;
  res.json({ url, token: shop.id });
});

router.get("/summary", async (req, res) => {
  const shop = await findShopByOwner(req.ownerId);
  if (!shop) {
    res.json({
      totalProducts: 0,
      inStockCount: 0,
      outOfStockCount: 0,
      activeRequestsCount: 0,
    });
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
