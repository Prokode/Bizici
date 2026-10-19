import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, Module } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Execute the real controllers, image parser, and ranker with in-memory DB
// queries and an AI transport stub. No database writes or paid AI calls.
const apiRequire = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const { build } = apiRequire("esbuild");
const fixture = { shops: [], pages: [], calls: [], scores: [], aiFailure: false };
const model = (name) => ({
  find(filter) {
    const call = { model: name, filter };
    fixture.calls.push(call);
    const query = {
      select() { return query; },
      sort(value) { call.sort = value; return query; },
      limit(value) { call.limit = value; return query; },
      async lean() { return name === "Shop" ? fixture.shops : fixture.pages.shift() ?? []; },
    };
    return query;
  },
});
fixture.Shop = model("Shop");
fixture.Product = model("Product");
fixture.create = async () => {
  if (fixture.aiFailure) throw new Error("AI unavailable");
  return { choices: [{ message: { content: JSON.stringify({ matches: fixture.scores }) } }] };
};
const entry = fileURLToPath(new URL("../../artifacts/api-server/src/controllers/public.ts", import.meta.url));
const built = await build({
  entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs",
  packages: "external",
  banner: { js: "const __fixtures = module.__fixtures;" },
  plugins: [{
    name: "search-fixtures",
    setup(build) {
      build.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: "db", namespace: "fixtures" }));
      build.onResolve({ filter: /^\.\/openai$/ }, () => ({ path: "ai", namespace: "fixtures" }));
      build.onLoad({ filter: /.*/, namespace: "fixtures" }, ({ path }) => ({
        contents: path === "db"
          ? `export const Shop = __fixtures.Shop, Product = __fixtures.Product;
             export const ShopReview = {}, AccountDeletionRequest = {}, ACCOUNT_DELETION_TYPES = [];`
          : `export const openai = { chat: { completions: { create: (...args) => __fixtures.create(...args) } } };`,
      }));
    },
  }],
});
const filename = fileURLToPath(new URL("../../artifacts/api-server/search-fixture.cjs", import.meta.url));
const compiled = new Module(filename);
compiled.paths = Module._nodeModulePaths(dirname(filename));
compiled.__fixtures = fixture;
compiled._compile(built.outputFiles[0].text, filename);
const { publicController } = compiled.exports;
const oid = (n) => n.toString(16).padStart(24, "0");
const product = (n) => ({
  _id: oid(n), shop: oid(1), name: "Blue shoes", price: 1000,
  photos: ["https://example.com/shoes.jpg"],
});
function reset(pages = []) {
  fixture.calls = [];
  fixture.pages = pages;
  fixture.scores = [];
  fixture.aiFailure = false;
  // ~111 km from the request: well beyond both 20 km and the local 50 km cap.
  fixture.shops = [{ _id: oid(1), name: "Far shop", location: { coordinates: [0, 1] } }];
}
const base = { lat: 0, lng: 0, radiusKm: 20 };
const photo = { ...base, imageBase64: "iVBORw0KGgo=", imageMimeType: "image/png" };
async function request(handler, params, image = false) {
  const req = { query: image ? {} : params, body: image ? params : {}, log: { error() {} } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; },
  };
  await publicController[handler](req, res);
  return res;
}

test("local search retains the chosen radius; wider search has no distance ceiling", async () => {
  reset([[product(100)]]);
  await request("search", { ...base, q: "shoes" });
  assert.equal(fixture.calls[0].filter.location.$nearSphere.$maxDistance, 20000);
  reset([[product(100)]]);
  const res = await request("search", { ...base, q: "shoes", scope: "all" });
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.products[0].distanceMeters > 100000);
  const geo = fixture.calls[0].filter.location;
  assert.equal(geo.$nearSphere, undefined);
  assert.equal(geo.$not.$geoWithin.$centerSphere[1], 20 / 6371.0088);
  const products = fixture.calls[1].filter;
  assert.deepEqual(products.shop.$in, [oid(1)]);
  assert.equal(products.deletedAt, null);
  assert.deepEqual(products.quantity, { $gt: 0 });
});

test("wider text pages can reach matches beyond the first 60", async () => {
  reset([Array.from({ length: 61 }, (_, i) => product(200 - i))]);
  const first = await request("search", { ...base, q: "shoes", scope: "all" });
  assert.equal(first.body.products.length, 60);
  assert.equal(first.body.nextCursor, oid(141));
  reset([[product(140)]]);
  const second = await request("search", { ...base, q: "shoes", scope: "all", cursor: first.body.nextCursor });
  assert.equal(String(fixture.calls[1].filter._id.$lt), oid(141));
  assert.equal(second.body.products[0].id, oid(140));
  assert.equal(second.body.nextCursor, null);
});

test("only local text search returns an explicitly marked fuzzy fallback pool", async () => {
  reset([[], [product(100)]]);
  const local = await request("search", { ...base, q: "jeen" });
  assert.equal(local.body.fuzzyFallback, true);
  reset([[]]);
  const expanded = await request("search", { ...base, q: "jeen", scope: "all" });
  assert.equal(expanded.body.fuzzyFallback, false);
  assert.deepEqual(expanded.body.products, []);
  assert.equal(fixture.calls.length, 2);
});

test("photo search advances past the first 24, even after an empty batch", async () => {
  reset([Array.from({ length: 25 }, (_, i) => product(200 - i))]);
  const first = await request("visualSearch", { ...photo, scope: "all" }, true);
  assert.deepEqual(first.body.matches, []);
  assert.equal(first.body.nextCursor, oid(177));
  reset([[product(176)]]);
  fixture.scores = [{ id: oid(176), confidence: 0.93 }];
  const next = await request("visualSearch", { ...photo, scope: "all", cursor: first.body.nextCursor }, true);
  assert.equal(String(fixture.calls[1].filter._id.$lt), oid(177));
  assert.equal(next.body.matches[0].id, oid(176));
  assert.ok(next.body.matches[0].distanceMeters > 20000);
  assert.equal(next.body.nextCursor, null);
});

test("all confident matches in a photo batch are retained, rather than dropping all but six", async () => {
  const products = Array.from({ length: 12 }, (_, i) => product(100 - i));
  reset([products]);
  fixture.scores = products.map((p) => ({ id: p._id, confidence: 0.9 }));
  const res = await request("visualSearch", { ...photo, scope: "all" }, true);
  assert.equal(res.body.matches.length, 12);
});

test("invalid cursors and locations are rejected before querying inventory", async () => {
  for (const params of [{ ...base, cursor: "bad" }, { ...base, lat: 91 }, { ...base, radiusKm: "bad" }]) {
    reset();
    assert.equal((await request("search", { ...params, q: "shoes" })).statusCode, 400);
    assert.equal(fixture.calls.length, 0);
  }
  reset();
  assert.equal((await request("visualSearch", { ...photo, cursor: "bad" }, true)).statusCode, 400);
  assert.equal(fixture.calls.length, 0);
});

test("AI failure is an error, not an empty completed catalog search", async () => {
  reset([[product(100)]]);
  fixture.aiFailure = true;
  const res = await request("visualSearch", { ...photo, scope: "all" }, true);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.matches, undefined);
});
