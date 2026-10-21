import { Router } from "express";
import { LocalPhotoError, localPhotosEnabled, validateLocalPhotoUpload, writeLocalPhotoUpload } from "../lib/localPhotoStorage";

const router = Router();

// The short-lived, size/type-bound signature is the upload credential. Never
// require or forward a seller's Clerk token to this direct-byte upload route.
router.put("/photo-uploads/:uploadId", async (req, res) => {
  try {
    if (!localPhotosEnabled()) { res.status(404).end(); return; }
    const upload = validateLocalPhotoUpload(String(req.params.uploadId), req.query);
    if (req.headers["content-type"]?.split(";")[0] !== upload.contentType) {
      res.status(400).json({ error: "Image content type does not match" }); return;
    }
    if (req.headers["content-length"] !== undefined && Number(req.headers["content-length"]) !== upload.size) {
      res.status(400).json({ error: "Image size does not match" }); return;
    }
    await writeLocalPhotoUpload(req, upload.objectPath, upload.size);
    res.status(204).end();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const status = error instanceof LocalPhotoError ? error.status : code === "ENOSPC" ? 507 : 503;
    if (status >= 500) req.log.error({ err: error }, "Persistent photo upload failed");
    if (!res.headersSent && !res.destroyed) res.status(status).json({ error: status >= 500 ? "Photo storage unavailable" : (error as Error).message });
  }
});

export default router;
