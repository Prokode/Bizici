import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { Service, Shop } from "@workspace/db";
import {
  serializeService,
  serializeShop,
  serializeProviderProfile,
} from "../lib/serialize";

/**
 * PUBLIC services endpoints — mounted BEFORE any router that uses
 * `router.use(requireAuth)`. Express middleware semantics: a router-level
 * `requireAuth` runs for EVERY request that flows through that router, not
 * only for matched routes. Putting these unauthenticated browse endpoints in
 * a dedicated router (mounted alongside `publicRouter` in `index.ts`)
 * guarantees they short-circuit before reaching shopsRouter / productsRouter.
 */
const router: IRouter = Router();

// Customer-facing search by location. Geo-filters Shops that offer services,
// then fans out the active services with snapshots of parent shop + provider.
router.get("/services/search", async (req, res) => {
  const lat = Number(req.query.latitude);
  const lng = Number(req.query.longitude);
  const radiusKm = Math.min(
    Math.max(Number(req.query.radiusKm) || 10, 0.1),
    100,
  );
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ error: "latitude and longitude required" });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const categoryIdRaw =
    typeof req.query.categoryId === "string" ? req.query.categoryId : null;
  const categoryId =
    categoryIdRaw && Types.ObjectId.isValid(categoryIdRaw)
      ? new Types.ObjectId(categoryIdRaw)
      : null;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  // Optional execution-mode filter. Applied AFTER serialization since it
  // operates on the resolved (effective) location, which depends on both
  // the service override and the parent shop's default.
  const slFilter =
    req.query.serviceLocation === "at_shop" ||
    req.query.serviceLocation === "at_customer" ||
    req.query.serviceLocation === "both"
      ? (req.query.serviceLocation as "at_shop" | "at_customer" | "both")
      : null;

  const shops = await Shop.aggregate<any>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: { kind: { $in: ["services", "hybrid"] } },
      },
    },
    { $limit: 200 },
  ]);

  if (shops.length === 0) {
    res.json([]);
    return;
  }

  const shopMap = new Map<string, any>(shops.map((s) => [String(s._id), s]));
  const shopIds = shops.map((s) => s._id);

  const serviceFilter: Record<string, unknown> = {
    shop: { $in: shopIds },
    isActive: true,
    deletedAt: null,
  };
  if (categoryId) serviceFilter.categories = categoryId;
  if (q.length > 0) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    serviceFilter.$or = [{ title: re }, { description: re }, { tags: re }];
  }
  const services = await Service.find(serviceFilter)
    .populate("categories")
    .lean();

  const out = services
    .map((svc) => {
      const shop = shopMap.get(String(svc.shop));
      if (!shop) return null;
      const distanceKm =
        typeof shop.distanceMeters === "number"
          ? Math.round((shop.distanceMeters / 1000) * 10) / 10
          : 0;
      const serializedService = serializeService(svc, {
        shopServiceLocation: shop.serviceProvider?.serviceLocation ?? null,
      });
      return {
        service: serializedService,
        shop: serializeShop(shop, { distanceKm }),
        provider: shop.serviceProvider
          ? serializeProviderProfile(shop.serviceProvider, {
              viewerIsOwner: false,
            })
          : null,
        distanceKm,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => {
      if (!slFilter) return true;
      const eff = r.service.effectiveServiceLocation;
      // "at_customer" filter accepts both pure-mobile and "both" providers.
      // "at_shop" filter accepts pure-shop and "both" providers.
      // "both" only matches providers explicitly supporting both modes.
      if (slFilter === "both") return eff === "both";
      return eff === slFilter || eff === "both";
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  res.json(out);
});

// Public provider detail — bundles shop snapshot, provider profile and the
// shop's currently active services so the customer detail screen can render
// in a single round-trip.
router.get("/services/providers/:shopId", async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.shopId as string)) {
    res.status(400).json({ error: "Invalid shopId" });
    return;
  }
  const shop = await Shop.findOne({
    _id: new Types.ObjectId(req.params.shopId as string),
    kind: { $in: ["services", "hybrid"] },
  }).lean();
  if (!shop) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const services = await Service.find({
    shop: shop._id,
    isActive: true,
    deletedAt: null,
  })
    .populate("categories")
    .lean();

  const shopLoc = shop.serviceProvider?.serviceLocation ?? null;
  res.json({
    shop: serializeShop(shop, { distanceKm: 0 }),
    provider: shop.serviceProvider
      ? serializeProviderProfile(shop.serviceProvider, { viewerIsOwner: false })
      : null,
    services: services.map((s) =>
      serializeService(s, { shopServiceLocation: shopLoc }),
    ),
  });
});

// Public single-service lookup. Used by the customer app provider detail
// screen to render a service card before authenticating.
router.get("/services/:id", async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id as string)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const service = await Service.findOne({
    _id: new Types.ObjectId(req.params.id as string),
    deletedAt: null,
  })
    .populate("categories")
    .lean();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(serializeService(service));
});

export default router;
