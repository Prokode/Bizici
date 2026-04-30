import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { Service, Shop } from "@workspace/db";
import { requireAuth, requireShopAccess } from "../lib/auth";
import {
  serializeService,
  serializeProviderProfile,
} from "../lib/serialize";

/**
 * AUTHENTICATED services endpoints. Public browsing is in `services-public.ts`
 * which is mounted earlier in `index.ts` to avoid the router-level requireAuth
 * short-circuit issue (see comment in index.ts).
 */
const router: IRouter = Router();

router.use(requireAuth);

// ─── Helpers ────────────────────────────────────────────────────────────────

function toObjectIds(ids: unknown): Types.ObjectId[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((s) => typeof s === "string" && Types.ObjectId.isValid(s))
    .map((s) => new Types.ObjectId(s as string));
}

function clampPricing(value: unknown): "fixed" | "hourly" | "quote" | null {
  if (value === "fixed" || value === "hourly" || value === "quote") return value;
  return null;
}

// List my shop's services (owner view — includes inactive).
router.get(
  "/shops/:shopId/services",
  requireShopAccess,
  async (req, res) => {
    const services = await Service.find({
      shop: new Types.ObjectId(req.params.shopId as string),
      deletedAt: null,
    })
      .populate("categories")
      .sort({ createdAt: -1 })
      .lean();
    res.json(services.map(serializeService));
  },
);

// Create a service (any shop member). Auto-flips Shop.kind to include services
// if the shop was created as a pure-products shop — owners explicitly creating
// a service are signaling intent, so we widen kind to "hybrid" rather than
// silently rejecting.
router.post(
  "/shops/:shopId/services",
  requireShopAccess,
  async (req, res) => {
    const body = req.body ?? {};
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const pricingType = clampPricing(body.pricingType);
    if (!pricingType) {
      res
        .status(400)
        .json({ error: "pricingType must be one of fixed, hourly, quote" });
      return;
    }

    const shopDoc = await Shop.findById(req.params.shopId as string)
      .select("sellerId kind")
      .lean();
    if (!shopDoc) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    if (shopDoc.kind === "products") {
      await Shop.updateOne(
        { _id: shopDoc._id },
        { $set: { kind: "hybrid" } },
      );
    }

    const created = await Service.create({
      shop: new Types.ObjectId(req.params.shopId as string),
      seller: shopDoc.sellerId,
      title: String(body.title).trim(),
      description:
        typeof body.description === "string" ? body.description : null,
      categories: toObjectIds(body.categoryIds),
      pricingType,
      price: typeof body.price === "number" ? body.price : null,
      durationMinutes:
        typeof body.durationMinutes === "number" ? body.durationMinutes : null,
      photos: Array.isArray(body.photos)
        ? body.photos.filter((p: unknown) => typeof p === "string")
        : [],
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t: unknown) => typeof t === "string")
        : [],
      isActive: body.isActive !== false,
    });

    const populated = await Service.findById(created._id)
      .populate("categories")
      .lean();
    res.json(serializeService(populated));
  },
);

router.patch(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id as string)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = req.body ?? {};
    const update: any = {};
    if (typeof body.title === "string") update.title = body.title.trim();
    if (body.description !== undefined) update.description = body.description;
    if (Array.isArray(body.categoryIds)) {
      update.categories = toObjectIds(body.categoryIds);
    }
    const pricingType = clampPricing(body.pricingType);
    if (pricingType) update.pricingType = pricingType;
    if (body.price !== undefined) {
      update.price = typeof body.price === "number" ? body.price : null;
    }
    if (body.durationMinutes !== undefined) {
      update.durationMinutes =
        typeof body.durationMinutes === "number" ? body.durationMinutes : null;
    }
    if (Array.isArray(body.photos)) update.photos = body.photos;
    if (Array.isArray(body.tags)) update.tags = body.tags;
    if (typeof body.isActive === "boolean") update.isActive = body.isActive;

    const service = await Service.findOneAndUpdate(
      {
        _id: new Types.ObjectId(req.params.id as string),
        shop: new Types.ObjectId(req.params.shopId as string),
        deletedAt: null,
      },
      update,
      { new: true },
    )
      .populate("categories")
      .lean();
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(serializeService(service));
  },
);

router.delete(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id as string)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const r = await Service.updateOne(
      {
        _id: new Types.ObjectId(req.params.id as string),
        shop: new Types.ObjectId(req.params.shopId as string),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } },
    );
    res.json({ success: r.modifiedCount > 0 });
  },
);

// ─── Provider profile (owner view, full age) ────────────────────────────────

router.get(
  "/shops/:shopId/provider-profile",
  requireShopAccess,
  async (req, res) => {
    const shop = await Shop.findById(req.params.shopId as string)
      .select("serviceProvider")
      .lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(
      serializeProviderProfile(shop.serviceProvider ?? {}, {
        viewerIsOwner: true,
      }),
    );
  },
);

router.patch(
  "/shops/:shopId/provider-profile",
  requireShopAccess,
  async (req, res) => {
    const body = req.body ?? {};
    const profileUpdate: Record<string, unknown> = {};

    if (body.firstName !== undefined)
      profileUpdate["serviceProvider.firstName"] = body.firstName ?? null;
    if (body.lastName !== undefined)
      profileUpdate["serviceProvider.lastName"] = body.lastName ?? null;
    if (body.age !== undefined) {
      profileUpdate["serviceProvider.age"] =
        typeof body.age === "number" ? body.age : null;
    }
    if (typeof body.hideAge === "boolean") {
      profileUpdate["serviceProvider.hideAge"] = body.hideAge;
    }
    if (body.bio !== undefined) profileUpdate["serviceProvider.bio"] = body.bio ?? null;
    if (body.photoUrl !== undefined)
      profileUpdate["serviceProvider.photoUrl"] = body.photoUrl ?? null;
    if (body.yearsExperience !== undefined) {
      profileUpdate["serviceProvider.yearsExperience"] =
        typeof body.yearsExperience === "number" ? body.yearsExperience : null;
    }
    if (Array.isArray(body.certifications)) {
      profileUpdate["serviceProvider.certifications"] = body.certifications.filter(
        (c: unknown) => typeof c === "string",
      );
    }
    if (typeof body.serviceRadiusKm === "number") {
      profileUpdate["serviceProvider.serviceRadiusKm"] = Math.min(
        Math.max(body.serviceRadiusKm, 1),
        100,
      );
    }
    if (Array.isArray(body.portfolioPhotos)) {
      profileUpdate["serviceProvider.portfolioPhotos"] = body.portfolioPhotos.filter(
        (p: unknown) => typeof p === "string",
      );
    }

    const updated = await Shop.findByIdAndUpdate(
      req.params.shopId as string,
      { $set: profileUpdate },
      { new: true },
    )
      .select("serviceProvider")
      .lean();
    if (!updated) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(
      serializeProviderProfile(updated.serviceProvider ?? {}, {
        viewerIsOwner: true,
      }),
    );
  },
);

export default router;
