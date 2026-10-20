import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { prepareProductPhotos } from "../../artifacts/nearbuy-business/lib/productPhotoPreparation";
import { validProductPhotos, imageTypeFromBytes } from "../../artifacts/api-server/src/lib/productPhotos";

test("gallery and camera URIs upload in order; existing remote photos are unchanged", async () => {
  const uploaded: string[] = [];
  const photos = await prepareProductPhotos(
    ["https://old.example/a.jpg?version=1", "file:///camera.jpg", "blob:gallery"],
    async (uri) => { uploaded.push(uri); return `https://api.example/${uploaded.length}.jpg`; },
    new Map(),
  );
  assert.deepEqual(uploaded, ["file:///camera.jpg", "blob:gallery"]);
  assert.deepEqual(photos, ["https://old.example/a.jpg?version=1", "https://api.example/1.jpg", "https://api.example/2.jpg"]);
});

test("failed uploads reject the entire preparation; retry reuses successes", async () => {
  const cache = new Map<string, string>();
  let calls = 0;
  const upload = async () => {
    calls++;
    if (calls === 2) throw new Error("network failure");
    return `https://api.example/${calls}.jpg`;
  };
  await assert.rejects(prepareProductPhotos(["file:a", "content:b"], upload, cache));
  const result = await prepareProductPhotos(["file:a", "content:b"], upload, cache);
  assert.equal(calls, 3);
  assert.deepEqual(result, ["https://api.example/1.jpg", "https://api.example/3.jpg"]);
});

test("removing every photo is an explicit empty array and never uploads", async () => {
  assert.deepEqual(await prepareProductPhotos([], async () => { throw new Error("unexpected upload"); }, new Map()), []);
});

test("unchanged remote photos do not require storage and failed upload results are not cached", async () => {
  const remote = ["https://cdn.example/one", "http://cdn.example/two"];
  assert.deepEqual(await prepareProductPhotos(remote, async () => { throw new Error("storage down"); }, new Map()), remote);
  const cache = new Map<string, string>();
  await assert.rejects(prepareProductPhotos(["file:photo"], async () => "blob:broken", cache));
  assert.equal(cache.size, 0);
});

test("API rejects local paths on create and patch but permits removal and omitted photos", () => {
  for (const uri of ["file:///photo.jpg", "content://photo", "blob:photo", "data:image/png;base64,abc", "/private/photo.jpg"]) {
    assert.equal(validProductPhotos({ photos: [uri] }), false);
    assert.equal(validProductPhotos({ imageUrl: uri }), false);
  }
  assert.equal(validProductPhotos({ photos: [null] }), false);
  assert.equal(validProductPhotos({ photos: "not an array" }), false);
  assert.equal(validProductPhotos({ photos: [] }), true);
  assert.equal(validProductPhotos({}), true);
  assert.equal(validProductPhotos({ photos: ["https://cdn.example/old.jpg"] }), true);
});

test("server verifies image signatures rather than trusting an SVG or HTML MIME label", () => {
  assert.equal(imageTypeFromBytes(Buffer.from([255, 216, 255, 0])), "image/jpeg");
  assert.equal(imageTypeFromBytes(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(imageTypeFromBytes(Buffer.from("GIF89a")), "image/gif");
  assert.equal(imageTypeFromBytes(Buffer.from("RIFFxxxxWEBP")), "image/webp");
  assert.equal(imageTypeFromBytes(Buffer.from("<script>alert()")), null);
});

test("save waits for preparation before either mutation and displays upload failures", () => {
  const source = readFileSync(new URL("../../artifacts/nearbuy-business/app/(home)/shops/[shopId]/add-product.tsx", import.meta.url), "utf8");
  const prepare = source.indexOf("resolvedPhotos = await prepareProductPhotos");
  assert.ok(prepare > 0 && prepare < source.indexOf("updateProduct.mutate("));
  assert.ok(prepare < source.indexOf("createProduct.mutate("));
  assert.match(source, /fail\(t\("addProduct\.uploadError"\)\)/);
  assert.match(source, /if \(saveLock\.current \|\| isSaving\) return/);
  assert.equal((source.match(/photos: resolvedPhotos/g) ?? []).length, 2);
});
