import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, shopsTable, broadcastRequestsTable } from "@workspace/db";
import { requireAuth, requireShopAccess } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEARCH_RADIUS_METERS = 5000;

router.get("/shops/:shopId/requests", requireShopAccess, async (req, res) => {
  const shopId = (req.params.shopId as string);
  const shopRows = await db
    .select({
      id: shopsTable.id,
      lat: sql<number>`ST_Y(${shopsTable.location}::geometry)`.as("lat"),
      lng: sql<number>`ST_X(${shopsTable.location}::geometry)`.as("lng"),
    })
    .from(shopsTable)
    .where(eq(shopsTable.id, shopId))
    .limit(1);

  if (shopRows.length === 0) {
    res.json([]);
    return;
  }
  const shop = shopRows[0]!;
  const shopPoint = sql`ST_SetSRID(ST_MakePoint(${shop.lng}, ${shop.lat}), 4326)::geography`;

  const rows = await db
    .select({
      id: broadcastRequestsTable.id,
      userId: broadcastRequestsTable.userId,
      query: broadcastRequestsTable.query,
      status: broadcastRequestsTable.status,
      latitude: sql<number>`ST_Y(${broadcastRequestsTable.location}::geometry)`,
      longitude: sql<number>`ST_X(${broadcastRequestsTable.location}::geometry)`,
      distanceMeters: sql<number>`ST_Distance(${broadcastRequestsTable.location}, ${shopPoint})`,
    })
    .from(broadcastRequestsTable)
    .where(
      sql`${broadcastRequestsTable.status} = 'active' AND ST_DWithin(${broadcastRequestsTable.location}, ${shopPoint}, ${SEARCH_RADIUS_METERS})`,
    )
    .orderBy(
      sql`ST_Distance(${broadcastRequestsTable.location}, ${shopPoint}) ASC`,
    );

  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      query: r.query,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      status: (r.status ?? "active") as "active" | "found" | "expired",
      distanceMeters: Math.round(Number(r.distanceMeters)),
    })),
  );
});

async function setStatus(
  shopId: string,
  id: string,
  status: "found" | "expired",
) {
  const [updated] = await db
    .update(broadcastRequestsTable)
    .set({ status })
    .where(
      sql`${broadcastRequestsTable.id} = ${id} AND ST_DWithin(
        ${broadcastRequestsTable.location},
        (SELECT location FROM ${shopsTable} WHERE id = ${shopId}),
        ${SEARCH_RADIUS_METERS}
      )`,
    )
    .returning({
      id: broadcastRequestsTable.id,
      userId: broadcastRequestsTable.userId,
      query: broadcastRequestsTable.query,
      status: broadcastRequestsTable.status,
      latitude: sql<number>`ST_Y(${broadcastRequestsTable.location}::geometry)`,
      longitude: sql<number>`ST_X(${broadcastRequestsTable.location}::geometry)`,
    });
  return updated ?? null;
}

router.post(
  "/shops/:shopId/requests/:id/found",
  requireShopAccess,
  async (req, res) => {
    const id = (req.params.id as string);
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const shopId = req.params.shopId as string;
    const updated = await setStatus(shopId, id, "found");
    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({
      id: updated.id,
      userId: updated.userId,
      query: updated.query,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      status: (updated.status ?? "found") as "active" | "found" | "expired",
      distanceMeters: 0,
    });
  },
);

router.post(
  "/shops/:shopId/requests/:id/expire",
  requireShopAccess,
  async (req, res) => {
    const id = (req.params.id as string);
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const shopId = req.params.shopId as string;
    const updated = await setStatus(shopId, id, "expired");
    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({
      id: updated.id,
      userId: updated.userId,
      query: updated.query,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      status: (updated.status ?? "expired") as "active" | "found" | "expired",
      distanceMeters: 0,
    });
  },
);

export default router;
