import { Readable } from "node:stream";
import type { Response as ExpressResponse } from "express";

export const MAX_BRAND_PHOTO_BYTES = 5 * 1024 * 1024;
export const BRAND_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const validBrandPhotoId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);

export function brandPhotoPath(shopId: string, photoId: string) {
  return `/api/public/shops/${shopId}/brand-photo/${photoId}`;
}

/** Same sidecar signing protocol as Replit's App Storage template; no mobile/web SDK dependency. */
export async function signBrandPhoto(shopId: string, photoId: string, method: "GET" | "PUT" | "HEAD" | "DELETE") {
  if (!/^[a-f0-9]{24}$/i.test(shopId) || !validBrandPhotoId(photoId)) throw new Error("Invalid photo identifier");
  const root = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!root || !root.includes("/")) throw new Error("App Storage is not configured");
  const slash = root.indexOf("/");
  const response = await fetch("http://127.0.0.1:1106/object-storage/signed-object-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: root.slice(0, slash),
      object_name: `${root.slice(slash + 1)}/shop-brands/${shopId}/${photoId}`,
      method,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("App Storage signing unavailable");
  const data = await response.json() as { signed_url?: string };
  if (typeof data.signed_url !== "string" || !data.signed_url.startsWith("https://")) throw new Error("Invalid storage response");
  return data.signed_url;
}

export function detectBrandPhotoType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString() === "WEBP") return "image/webp";
  return null;
}

export async function verifyBrandPhoto(shopId: string, photoId: string) {
  const head = await fetch(await signBrandPhoto(shopId, photoId, "HEAD"), { method: "HEAD", signal: AbortSignal.timeout(10_000) });
  if (head.status === 404) return false;
  if (!head.ok) throw new Error("Cannot inspect uploaded photo");
  const size = Number(head.headers.get("content-length"));
  const mime = head.headers.get("content-type")?.split(";")[0];
  if (!size || size > MAX_BRAND_PHOTO_BYTES || !BRAND_PHOTO_TYPES.some((type) => type === mime)) return false;
  const response = await fetch(await signBrandPhoto(shopId, photoId, "GET"), {
    headers: { Range: "bytes=0-15" }, signal: AbortSignal.timeout(10_000),
  });
  // GCS supports byte ranges. Refuse a full response rather than buffering unbounded content.
  if (response.status !== 206) { await response.body?.cancel(); return false; }
  return detectBrandPhotoType(new Uint8Array(await response.arrayBuffer())) === mime;
}

export async function serveBrandPhoto(shopId: string, photoId: string, res: ExpressResponse) {
  const response = await fetch(await signBrandPhoto(shopId, photoId, "GET"), { signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.body) {
    res.status(response.status === 404 ? 404 : 503).end();
    return;
  }
  const mime = response.headers.get("content-type")?.split(";")[0];
  const size = Number(response.headers.get("content-length"));
  if (!BRAND_PHOTO_TYPES.some((type) => type === mime) || !size || size > MAX_BRAND_PHOTO_BYTES) {
    await response.body.cancel();
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", mime!);
  res.setHeader("Content-Length", size);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=60");
  const stream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  res.on("close", () => stream.destroy());
  stream.on("error", () => res.destroy());
  stream.pipe(res);
}
