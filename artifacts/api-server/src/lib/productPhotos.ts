import { Schema, model } from "mongoose";

export const MAX_PRODUCT_PHOTO_BYTES = 10 * 1024 * 1024;
export const PRODUCT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Keep upload ownership separate from products: an upload may precede creation.
export const ProductPhotoUpload = model("ProductPhotoUpload", new Schema({
  shopId: { type: String, required: true },
  userId: { type: String, required: true },
  objectPath: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  completedAt: { type: Date, default: null },
  finalObjectPath: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
}));

export function imageTypeFromBytes(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString())) return "image/gif";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export function isRemoteProductPhoto(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

export function validProductPhotos(body: { photos?: unknown; imageUrl?: unknown }): boolean {
  if (body.photos !== undefined &&
      (!Array.isArray(body.photos) || !body.photos.every(isRemoteProductPhoto))) return false;
  return body.imageUrl == null || isRemoteProductPhoto(body.imageUrl);
}
