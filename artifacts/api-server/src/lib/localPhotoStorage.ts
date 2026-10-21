import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { copyFile, link, lstat, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { imageTypeFromBytes, MAX_PRODUCT_PHOTO_BYTES } from "./productPhotos";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const KEY = new RegExp(`^local:(uploads|published)/(${UUID})$`);
const ID = new RegExp(`^${UUID}$`);
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TTL = 15 * 60_000;

export class LocalPhotoError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function localPhotosEnabled() {
  const provider = process.env.PHOTO_STORAGE_PROVIDER;
  if (!provider || provider === "app-storage") return false;
  if (provider !== "local") throw new Error("Unknown photo storage provider");
  return true;
}

export function isLocalPhotoPath(value: string) { return KEY.test(value); }

function root() {
  const value = process.env.PHOTO_STORAGE_DIR;
  if (!value || !path.isAbsolute(value)) throw new Error("Persistent photo directory is not configured");
  return path.resolve(value);
}

function filename(key: string) {
  const match = KEY.exec(key);
  if (!match) throw new LocalPhotoError("Invalid photo path", 400);
  return path.join(root(), match[1], match[2]);
}

function secret() {
  const value = process.env.ADMIN_JWT_SECRET;
  if (!value || value.length < 32) throw new Error("Photo upload signing is not configured");
  return value;
}

function signature(id: string, expires: string, mime: string, size: string) {
  return createHmac("sha256", secret()).update(JSON.stringify([id, expires, mime, size])).digest("base64url");
}

export function localBrandPhotoId(shopId: string, uploadId: string) {
  if (!/^[a-f0-9]{24}$/i.test(shopId) || !ID.test(uploadId)) throw new LocalPhotoError("Invalid shop upload", 400);
  const expires = String(Date.now() + TTL);
  return `local-upload-${uploadId}.${expires}.${signature(`brand:${shopId}:${uploadId}`, expires, "brand-proof", "0")}`;
}

export function localBrandUploadPath(shopId: string, photoId: string) {
  const match = new RegExp(`^local-upload-(${UUID})\\.(\\d+)\\.([A-Za-z0-9_-]{43})$`).exec(photoId);
  if (!match || Number(match[2]) <= Date.now() || Number(match[2]) > Date.now() + TTL) {
    throw new LocalPhotoError("Invalid or expired shop photo", 400);
  }
  const expected = Buffer.from(signature(`brand:${shopId}:${match[1]}`, match[2], "brand-proof", "0"));
  const actual = Buffer.from(match[3]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new LocalPhotoError("Invalid shop photo", 400);
  return `local:uploads/${match[1]}`;
}

export function createLocalPhotoUpload(contentType: string, size: number) {
  if (!TYPES.includes(contentType) || !Number.isSafeInteger(size) || size <= 0 || size > MAX_PRODUCT_PHOTO_BYTES) {
    throw new LocalPhotoError("Invalid image metadata", 400);
  }
  // Resolve configuration at initiation, not after a seller has uploaded bytes.
  root();
  const base = new URL(process.env.PHOTO_PUBLIC_ORIGIN ?? "");
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/" ||
      (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) {
    throw new Error("Photo public origin must be an HTTPS origin");
  }
  const id = randomUUID();
  const expires = String(Date.now() + TTL);
  const count = String(size);
  const query = new URLSearchParams({ expires, type: contentType, size: count, signature: signature(id, expires, contentType, count) });
  return { id, objectPath: `local:uploads/${id}`, uploadURL: `${base.origin}/api/photo-uploads/${id}?${query}` };
}

export function validateLocalPhotoUpload(id: string, query: Record<string, unknown>) {
  const { expires, type, size, signature: supplied } = query;
  if (!ID.test(id) || ![expires, type, size, supplied].every(v => typeof v === "string")) {
    throw new LocalPhotoError("Invalid upload authorization", 403);
  }
  const expiry = expires as string, mime = type as string, count = size as string, mac = supplied as string;
  if (!/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || Number(expiry) > Date.now() + TTL ||
      !/^\d+$/.test(count) || !TYPES.includes(mime) || Number(count) <= 0 || Number(count) > MAX_PRODUCT_PHOTO_BYTES) {
    throw new LocalPhotoError("Expired or invalid upload authorization", 403);
  }
  const expected = Buffer.from(signature(id, expiry, mime, count));
  const actual = Buffer.from(mac);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new LocalPhotoError("Invalid upload authorization", 403);
  return { objectPath: `local:uploads/${id}`, contentType: mime, size: Number(count) };
}

export async function writeLocalPhotoUpload(source: Readable, key: string, expectedSize: number) {
  if (!key.startsWith("local:uploads/")) throw new LocalPhotoError("Invalid upload path", 400);
  const target = filename(key);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const pending = `${target}.pending-${randomUUID()}`;
  let received = 0;
  const bound = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      received += chunk.length;
      if (received > expectedSize || received > MAX_PRODUCT_PHOTO_BYTES) return done(new LocalPhotoError("Image too large", 413));
      done(null, chunk);
    },
    flush(done) { done(received === expectedSize ? null : new LocalPhotoError("Incomplete image upload", 400)); },
  });
  try {
    await pipeline(source, bound, createWriteStream(pending, { flags: "wx", mode: 0o600 }), { signal: AbortSignal.timeout(90_000) });
    // Atomic, exclusive publication of the complete temporary upload. Reusing a
    // capability cannot overwrite bytes, and completion never sees partial files.
    await link(pending, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new LocalPhotoError("Upload already received", 409);
    throw error;
  } finally {
    await unlink(pending).catch(() => {});
  }
}

export async function localPhotoFile(key: string) {
  const file = filename(key);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new LocalPhotoError("Photo not found", 404);
  return {
    async getMetadata(): Promise<[{ size: number }]> { return [{ size: (await lstat(file)).size }]; },
    async download({ start, end }: { start: number; end: number }): Promise<[Buffer]> {
      const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const bytes = Buffer.alloc(Math.max(0, end - start + 1));
        const { bytesRead } = await handle.read(bytes, 0, bytes.length, start);
        return [bytes.subarray(0, bytesRead)];
      } finally { await handle.close(); }
    },
    createReadStream() { return createReadStream(file, { flags: "r" }); },
    async delete() { await unlink(file); },
  };
}

export async function publishLocalPhoto(
  sourcePath: string,
  options: { maxBytes: number; allowedTypes: readonly string[]; size?: number; contentType?: string },
) {
  if (!sourcePath.startsWith("local:uploads/")) throw new LocalPhotoError("Invalid source photo", 400);
  await localPhotoFile(sourcePath);
  const finalPath = `local:published/${randomUUID()}`;
  const destination = filename(finalPath);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  try {
    await copyFile(filename(sourcePath), destination, constants.COPYFILE_EXCL);
    const file = await localPhotoFile(finalPath);
    const [metadata] = await file.getMetadata();
    const [header] = await file.download({ start: 0, end: 15 });
    const contentType = imageTypeFromBytes(header);
    if (!contentType || !options.allowedTypes.includes(contentType) || metadata.size <= 0 || metadata.size > options.maxBytes ||
        (options.size !== undefined && options.size !== metadata.size) ||
        (options.contentType !== undefined && options.contentType !== contentType)) {
      throw new LocalPhotoError("Invalid image bytes or size", 400);
    }
    return { finalPath, file, contentType, size: metadata.size };
  } catch (error) {
    await unlink(destination).catch(() => {});
    throw error;
  }
}
