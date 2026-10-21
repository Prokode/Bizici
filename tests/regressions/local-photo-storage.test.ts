import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import {
  createLocalPhotoUpload, validateLocalPhotoUpload, localPhotosEnabled,
  localPhotoFile, writeLocalPhotoUpload, publishLocalPhoto, localBrandPhotoId, localBrandUploadPath,
} from "../../artifacts/api-server/src/lib/localPhotoStorage";
import uploadRouter from "../../artifacts/api-server/src/routes/local-photo-uploads";
import { serveBrandPhoto } from "../../artifacts/api-server/src/lib/shopBrandPhotoStorage";

const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const express = require("express");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=", "base64");
const options = { maxBytes: 5 * 1024 * 1024, allowedTypes: ["image/png", "image/jpeg", "image/webp"] };

test("persistent Ubuntu photo uploads and immutable publication", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "bizici-local-photos-test-"));
  const keys = ["PHOTO_STORAGE_PROVIDER", "PHOTO_STORAGE_DIR", "PHOTO_PUBLIC_ORIGIN", "ADMIN_JWT_SECRET"] as const;
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const app = express();
  app.use((req: any, _res: unknown, next: () => void) => {
    req.log = { error() {} };
    next();
  });
  app.use("/api", uploadRouter);
  app.get("/test/brand/:id", async (req: any, res: any) => {
    try { await serveBrandPhoto("0123456789abcdef01234567", req.params.id, res); }
    catch { res.status(503).end(); }
  });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  process.env.PHOTO_STORAGE_PROVIDER = "local";
  process.env.PHOTO_STORAGE_DIR = directory;
  process.env.PHOTO_PUBLIC_ORIGIN = `http://127.0.0.1:${address.port}`;
  process.env.ADMIN_JWT_SECRET = "local-photo-regression-placeholder-key-not-real";
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  await t.test("signed URL reaches a real byte-upload endpoint, with no bearer token", async () => {
    const upload = createLocalPhotoUpload("image/png", png.length);
    const response = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png });
    assert.equal(response.status, 204);
    const file = await localPhotoFile(upload.objectPath);
    assert.deepEqual((await file.download({ start: 0, end: png.length - 1 }))[0], png);
    assert.equal((await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png })).status, 409);
    const published = await publishLocalPhoto(upload.objectPath, { ...options, size: png.length, contentType: "image/png" });
    assert.notEqual(published.finalPath, upload.objectPath);
    await file.delete();
    // Published data persists independently of the upload and a new file handle.
    const fresh = await localPhotoFile(published.finalPath);
    assert.deepEqual((await fresh.download({ start: 0, end: png.length - 1 }))[0], png);
    const publicId = `local-${published.finalPath.slice("local:published/".length)}`;
    const publicImage = await fetch(`http://127.0.0.1:${address.port}/test/brand/${publicId}`);
    assert.equal(publicImage.status, 200);
    assert.equal(publicImage.headers.get("content-type"), "image/png");
    assert.equal(publicImage.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), png);
  });

  await t.test("expiry, signature, upload id, MIME and size cannot be changed", async () => {
    const upload = createLocalPhotoUpload("image/png", png.length);
    for (const [key, value] of [["signature", "A".repeat(43)], ["expires", String(Date.now() - 1)], ["size", String(png.length + 1)], ["type", "image/jpeg"]]) {
      const url = new URL(upload.uploadURL);
      url.searchParams.set(key, value);
      assert.equal((await fetch(url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png })).status, 403);
    }
    const moved = new URL(upload.uploadURL);
    moved.pathname = `/api/photo-uploads/${randomUUID()}`;
    assert.equal((await fetch(moved, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png })).status, 403);
    assert.equal((await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: png })).status, 400);
    assert.equal((await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png.subarray(1) })).status, 400);
  });

  await t.test("brand completion proof belongs to exactly one shop", () => {
    const upload = createLocalPhotoUpload("image/png", png.length);
    const shop = "0123456789abcdef01234567";
    const ticket = localBrandPhotoId(shop, upload.id);
    assert.equal(localBrandUploadPath(shop, ticket), upload.objectPath);
    assert.throws(() => localBrandUploadPath("0123456789abcdef01234568", ticket));
    assert.throws(() => localBrandUploadPath(shop, ticket.replace(upload.id, randomUUID())));
    assert.throws(() => localBrandUploadPath(shop, `local-${upload.id}`));
  });

  await t.test("truncated or oversized streams never expose a partial upload", async () => {
    const upload = createLocalPhotoUpload("image/png", png.length);
    await assert.rejects(writeLocalPhotoUpload(Readable.from(png.subarray(1)), upload.objectPath, png.length));
    await assert.rejects(writeLocalPhotoUpload(Readable.from(Buffer.concat([png, png])), upload.objectPath, png.length));
    await assert.rejects(localPhotoFile(upload.objectPath));
    assert.ok((await readdir(path.join(directory, "uploads"))).every(name => !name.includes(".pending-")));
  });

  await t.test("invalid bytes, MIME mismatch, and brand size limits prevent publication", async () => {
    const before = await readdir(path.join(directory, "published"));
    for (const bytes of [Buffer.from("<svg><script>bad</script></svg>"), Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])]) {
      const upload = createLocalPhotoUpload("image/png", bytes.length);
      await writeLocalPhotoUpload(Readable.from(bytes), upload.objectPath, bytes.length);
      await assert.rejects(publishLocalPhoto(upload.objectPath, options));
    }
    const upload = createLocalPhotoUpload("image/png", png.length);
    await writeLocalPhotoUpload(Readable.from(png), upload.objectPath, png.length);
    await assert.rejects(publishLocalPhoto(upload.objectPath, { ...options, contentType: "image/jpeg" }));
    assert.deepEqual(await readdir(path.join(directory, "published")), before);
  });

  await t.test("paths cannot escape storage and symlinks are not served", async () => {
    await assert.rejects(localPhotoFile("local:published/../../etc/passwd"));
    const outside = path.join(directory, "outside");
    await writeFile(outside, "private");
    const id = randomUUID();
    await symlink(outside, path.join(directory, "published", id));
    await assert.rejects(localPhotoFile(`local:published/${id}`));
    assert.throws(() => validateLocalPhotoUpload("../private", {}));
  });

  await t.test("provider and configuration errors are explicit, never silent fallbacks", () => {
    assert.equal(localPhotosEnabled(), true);
    assert.throws(() => createLocalPhotoUpload("image/svg+xml", 12));
    assert.throws(() => createLocalPhotoUpload("image/png", 11 * 1024 * 1024));
    process.env.PHOTO_PUBLIC_ORIGIN = "http://untrusted.example";
    assert.throws(() => createLocalPhotoUpload("image/png", png.length));
    process.env.PHOTO_STORAGE_PROVIDER = "misspelled";
    assert.throws(() => localPhotosEnabled());
    delete process.env.PHOTO_STORAGE_PROVIDER;
    assert.equal(localPhotosEnabled(), false);
  });
});
