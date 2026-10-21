import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { requireAuth, requireShopAccess } from "../lib/auth";
import { ObjectNotFoundError, ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { setObjectAclPolicy } from "../lib/objectAcl";
import { ProductPhotoUpload, MAX_PRODUCT_PHOTO_BYTES, PRODUCT_PHOTO_TYPES, imageTypeFromBytes } from "../lib/productPhotos";
import { RequestProductPhotoUploadBody } from "@workspace/api-zod";
import { createLocalPhotoUpload, isLocalPhotoPath, localPhotoFile, localPhotosEnabled, publishLocalPhoto, LocalPhotoError } from "../lib/localPhotoStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const photoPath = (id: string) => `/api/product-photos/${id}`;

// This route must precede routers with global requireAuth middleware.
router.get("/product-photos/:photoId", async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.photoId))) {
    res.status(404).end();
    return;
  }
  const upload = await ProductPhotoUpload.findOne({ _id: req.params.photoId, completedAt: { $ne: null } }).lean();
  if (!upload) { res.status(404).end(); return; }
  try {
    if (!upload.finalObjectPath) { res.status(404).end(); return; }
    const file = isLocalPhotoPath(upload.finalObjectPath)
      ? await localPhotoFile(upload.finalObjectPath)
      : await storage.getObjectEntityFile(upload.finalObjectPath);
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > MAX_PRODUCT_PHOTO_BYTES) { res.status(404).end(); return; }
    res.set({
      "Content-Type": upload.contentType,
      "Content-Length": String(metadata.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    file.createReadStream().on("error", (err) => {
      req.log.error({ err }, "Product photo read failed");
      res.destroy();
    }).pipe(res);
  } catch (err) {
    req.log.warn({ err }, "Product photo unavailable");
    res.status(err instanceof ObjectNotFoundError || (err as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 503).end();
  }
});

router.post("/shops/:shopId/product-photos", requireAuth, requireShopAccess, async (req, res) => {
  const parsed = RequestProductPhotoUploadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid image metadata (maximum 10 MB)" }); return; }
  try {
    const local = localPhotosEnabled() ? createLocalPhotoUpload(parsed.data.contentType, parsed.data.size) : null;
    const uploadURL = local?.uploadURL ?? await storage.getObjectEntityUploadURL();
    const objectPath = local?.objectPath ?? storage.normalizeObjectEntityPath(uploadURL);
    const upload = await ProductPhotoUpload.create({
      shopId: String(req.params.shopId), userId: req.userId, objectPath, ...parsed.data,
    });
    res.json({ uploadId: String(upload._id), uploadURL });
  } catch (err) {
    req.log.error({ err }, "Product photo upload initialization failed");
    res.status(503).json({ error: "Photo storage unavailable" });
  }
});

router.post("/shops/:shopId/product-photos/:uploadId/complete", requireAuth, requireShopAccess, async (req, res) => {
  if (!Types.ObjectId.isValid(String(req.params.uploadId))) {
    res.status(400).json({ error: "Invalid upload" }); return;
  }
  const upload = await ProductPhotoUpload.findOne({
    _id: req.params.uploadId, shopId: String(req.params.shopId), userId: req.userId,
  });
  if (!upload) { res.status(404).json({ error: "Upload not found" }); return; }
  if (upload.completedAt) { res.json({ photoPath: photoPath(String(upload._id)) }); return; }
  if (Date.now() - upload.createdAt.getTime() > 15 * 60_000) {
    res.status(400).json({ error: "Upload expired; select the photo again" }); return;
  }
  try {
    if (isLocalPhotoPath(upload.objectPath)) {
      const publishedPhoto = await publishLocalPhoto(upload.objectPath, {
        maxBytes: MAX_PRODUCT_PHOTO_BYTES, allowedTypes: PRODUCT_PHOTO_TYPES,
        size: upload.size, contentType: upload.contentType,
      });
      try {
        const published = await ProductPhotoUpload.updateOne(
          { _id: upload._id, completedAt: null },
          { $set: { completedAt: new Date(), finalObjectPath: publishedPhoto.finalPath } },
        );
        if (published.modifiedCount === 0) await publishedPhoto.file.delete();
      } catch (error) {
        await publishedPhoto.file.delete().catch(() => {});
        throw error;
      }
      res.json({ photoPath: photoPath(String(upload._id)) });
      return;
    }
    const source = await storage.getObjectEntityFile(upload.objectPath);
    // Copy to a non-presigned path before verification: the PUT URL must never
    // be able to overwrite a published image (including during completion).
    const dir = storage.getPrivateObjectDir().replace(/^\/|\/$/g, "");
    const [bucket, ...prefix] = dir.split("/");
    const finalObjectPath = `/objects/product-photos/${randomUUID()}`;
    const destination = objectStorageClient.bucket(bucket).file(`${prefix.join("/")}/${finalObjectPath.slice("/objects/".length)}`);
    await source.copy(destination);
    const [metadata] = await destination.getMetadata();
    const [header] = await destination.download({ start: 0, end: 15 });
    const contentType = imageTypeFromBytes(header);
    if (!contentType || !PRODUCT_PHOTO_TYPES.includes(contentType) ||
        contentType !== upload.contentType || Number(metadata.size) !== upload.size ||
        Number(metadata.size) > MAX_PRODUCT_PHOTO_BYTES) {
      await destination.delete({ ignoreNotFound: true });
      res.status(400).json({ error: "Invalid image bytes or size" }); return;
    }
    await destination.setMetadata({ contentType });
    await setObjectAclPolicy(destination, { owner: req.userId, visibility: "public" });
    // Concurrent completion attempts publish only one immutable copy.
    const published = await ProductPhotoUpload.updateOne(
      { _id: upload._id, completedAt: null },
      { $set: { completedAt: new Date(), finalObjectPath } },
    );
    if (published.modifiedCount === 0) await destination.delete({ ignoreNotFound: true });
    res.json({ photoPath: photoPath(String(upload._id)) });
  } catch (err) {
    req.log.warn({ err }, "Product photo upload completion failed");
    const invalid = err instanceof ObjectNotFoundError || err instanceof LocalPhotoError || (err as NodeJS.ErrnoException).code === "ENOENT";
    res.status(invalid ? 400 : 503).json({ error: "Photo upload could not be verified" });
  }
});

export default router;
