import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { Shop, BroadcastRequest } from "@workspace/db";
import { requireAuth, requireShopAccess } from "../lib/auth";
import { serializeBroadcastRequest } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

const SEARCH_RADIUS_METERS = 5000;

router.get("/shops/:shopId/requests", requireShopAccess, async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).lean();
  if (!shop) {
    res.json([]);
    return;
  }
  const coords = (shop.location as any)?.coordinates ?? [0, 0];
  const [lng, lat] = coords;

  // $geoNear via aggregation gives us distance. Use 2dsphere index.
  const rows = await BroadcastRequest.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: SEARCH_RADIUS_METERS,
        spherical: true,
        query: { status: "active" },
      },
    },
    { $sort: { distanceMeters: 1 } },
    { $limit: 50 },
  ]);

  res.json(rows.map((r) => serializeBroadcastRequest(r, r.distanceMeters)));
});

async function setStatus(
  shopId: string,
  id: string,
  status: "found" | "expired",
) {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(shopId)) return null;
  const shop = await Shop.findById(shopId).lean();
  if (!shop) return null;
  const updated = await BroadcastRequest.findOneAndUpdate(
    {
      _id: new Types.ObjectId(id),
      location: {
        $nearSphere: {
          $geometry: shop.location as any,
          $maxDistance: SEARCH_RADIUS_METERS,
        },
      },
    },
    { $set: { status } },
    { new: true },
  ).lean();
  return updated;
}

router.post(
  "/shops/:shopId/requests/:id/found",
  requireShopAccess,
  async (req, res) => {
    const updated = await setStatus(req.params.shopId, req.params.id, "found");
    if (!updated) {
      res.status(404).json({ error: "Request not found or out of range" });
      return;
    }
    res.json(serializeBroadcastRequest(updated, 0));
  },
);

router.post(
  "/shops/:shopId/requests/:id/expire",
  requireShopAccess,
  async (req, res) => {
    const updated = await setStatus(req.params.shopId, req.params.id, "expired");
    if (!updated) {
      res.status(404).json({ error: "Request not found or out of range" });
      return;
    }
    res.json(serializeBroadcastRequest(updated, 0));
  },
);

export default router;
