import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Shop, BroadcastRequest } from "@workspace/db";
import { serializeBroadcastRequest } from "../lib/serialize";

const SEARCH_RADIUS_METERS = 5000;

async function setStatus(
  shopId: string,
  id: string,
  status: "found" | "expired",
) {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(shopId))
    return null;
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

export const requestsController = {
  listForShop: async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.shopId).lean();
    if (!shop) {
      res.json([]);
      return;
    }
    const coords = (shop.location as any)?.coordinates ?? [0, 0];
    const [lng, lat] = coords;

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
  },

  markFound: async (req: Request, res: Response) => {
    const updated = await setStatus(String(req.params.shopId), String(req.params.id), "found");
    if (!updated) {
      res.status(404).json({ error: "Request not found or out of range" });
      return;
    }
    res.json(serializeBroadcastRequest(updated, 0));
  },

  markExpired: async (req: Request, res: Response) => {
    const updated = await setStatus(String(req.params.shopId), String(req.params.id), "expired");
    if (!updated) {
      res.status(404).json({ error: "Request not found or out of range" });
      return;
    }
    res.json(serializeBroadcastRequest(updated, 0));
  },
};
