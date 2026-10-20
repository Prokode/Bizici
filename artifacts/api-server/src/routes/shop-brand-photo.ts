import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { Shop } from "@workspace/db";
import { requireAuth, requireSeller, requireShopAccess } from "../lib/auth";
import { serializeShop } from "../lib/serialize";
import {
  brandPhotoPath, BRAND_PHOTO_TYPES, MAX_BRAND_PHOTO_BYTES,
  validBrandPhotoId, signBrandPhoto, verifyBrandPhoto, serveBrandPhoto,
} from "../lib/shopBrandPhotoStorage";

const router: IRouter = Router();
const validShopId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);

// Public brand assets only. A shop never exposes private product/account uploads here.
router.get("/public/shops/:shopId/brand-photo/:photoId", async (req, res) => {
  const { shopId, photoId } = req.params;
  if (!validShopId(shopId) || !validBrandPhotoId(photoId)) { res.status(404).end(); return; }
  const shop = await Shop.findById(shopId).select("brandPhotoUrl").lean();
  if (!shop || shop.brandPhotoUrl !== brandPhotoPath(shopId, photoId)) { res.status(404).end(); return; }
  try { await serveBrandPhoto(shopId, photoId, res); }
  catch { if (!res.headersSent) res.status(503).end(); else res.destroy(); }
});

router.post("/shops/:shopId/brand-photo/upload", requireAuth, requireShopAccess, requireSeller, async (req, res) => {
  const shopId = req.params.shopId as string;
  const { contentType, size } = req.body ?? {};
  if (!BRAND_PHOTO_TYPES.includes(contentType) || !Number.isSafeInteger(size) || size <= 0 || size > MAX_BRAND_PHOTO_BYTES) {
    res.status(400).json({ error: "Choose a JPEG, PNG or WebP image up to 5 MB" }); return;
  }
  try {
    const photoId = randomUUID();
    res.json({ photoId, uploadUrl: await signBrandPhoto(shopId, photoId, "PUT") });
  } catch {
    res.status(503).json({ error: "Photo uploads temporarily unavailable" });
  }
});

router.put("/shops/:shopId/brand-photo", requireAuth, requireShopAccess, requireSeller, async (req, res) => {
  const shopId = req.params.shopId as string;
  const photoId: unknown = req.body?.photoId;
  if (photoId !== null && !validBrandPhotoId(photoId)) { res.status(400).json({ error: "Invalid uploaded photo" }); return; }
  try {
    if (photoId !== null && !(await verifyBrandPhoto(shopId, photoId as string))) {
      res.status(400).json({ error: "Upload a valid JPEG, PNG or WebP image up to 5 MB before saving" }); return;
    }
    const shop = await Shop.findByIdAndUpdate(shopId, {
      brandPhotoUrl: photoId === null ? null : brandPhotoPath(shopId, photoId as string),
    }, { new: true }).lean();
    if (!shop) { res.status(404).json({ error: "Shop not found" }); return; }
    res.json(serializeShop(shop, { viewerIsOwner: true }));
  } catch {
    res.status(503).json({ error: "Could not save shop photo. Please try again" });
  }
});

export default router;
