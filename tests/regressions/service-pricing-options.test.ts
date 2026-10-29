import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { Types } from "mongoose";
import { serializeService } from "../../artifacts/api-server/src/lib/serialize";
import { parseServicePricingOptions, cheapestServiceOption } from "../../artifacts/api-server/src/lib/service-pricing";
import { Service } from "../../lib/db/src/models/Service";
import { validatePricingOptionDrafts } from "../../artifacts/nearbuy-business/lib/servicePricingOptions";
import { serviceFormValues, serviceSaveError } from "../../artifacts/nearbuy-business/lib/serviceFormValues";
import { prepareProductPhotos } from "../../artifacts/nearbuy-business/lib/productPhotoPreparation";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const offers = [
  { label: "Séance courte", durationMinutes: 15, price: 2500 },
  { label: "Séance longue", durationMinutes: 30, price: 4500 },
];

test("independently priced durations preserve the discounted longer offer without multiplying FCFA by 100", () => {
  assert.deepEqual(parseServicePricingOptions(offers, "fixed"), offers);
  assert.equal(offers[1].price, 4500);
  assert.deepEqual(cheapestServiceOption(offers), offers[0]);
  assert.deepEqual(cheapestServiceOption([...offers].reverse()), offers[0]);
});

test("prices, whole-minute durations, labels and maximum count are validated", () => {
  for (const option of [
    { price: -1, durationMinutes: 15 }, { price: NaN, durationMinutes: 15 },
    { price: Infinity, durationMinutes: 15 }, { price: "2500", durationMinutes: 15 },
    { price: 2500, durationMinutes: 0 }, { price: 2500, durationMinutes: 1.5 },
    { price: 2500, durationMinutes: "15" }, { price: 2500, durationMinutes: 15, label: "x".repeat(81) },
    { price: 2500, durationMinutes: 15, label: {} }, null,
  ]) assert.throws(() => parseServicePricingOptions([option], "fixed"));
  assert.throws(() => parseServicePricingOptions({}, "fixed"));
  assert.throws(() => parseServicePricingOptions(Array(21).fill(offers[0]), "fixed"));
  assert.deepEqual(parseServicePricingOptions([{ price: 0, durationMinutes: 1 }], "fixed"), [
    { label: null, price: 0, durationMinutes: 1 },
  ]);
});

test("empty list removes offers; hourly/quote pricing cannot retain fixed-price options", () => {
  assert.deepEqual(parseServicePricingOptions([], "fixed"), []);
  assert.deepEqual(parseServicePricingOptions([], "hourly"), []);
  assert.deepEqual(parseServicePricingOptions([], "quote"), []);
  assert.throws(() => parseServicePricingOptions(offers, "hourly"));
  assert.throws(() => parseServicePricingOptions(offers, "quote"));
});

test("merchant input accepts French decimal commas and rejects incomplete, unsafe or invalid offers", () => {
  assert.deepEqual(validatePricingOptionDrafts([
    { label: " Court ", durationMinutes: "15", price: "2500" },
    { label: "", durationMinutes: "30", price: "4500,50" },
  ]), { valid: true, options: [
    { label: "Court", durationMinutes: 15, price: 2500 },
    { label: null, durationMinutes: 30, price: 4500.5 },
  ] });
  for (const [durationMinutes, price] of [["15x", "2500"], ["15", "2500x"], ["", "2500"],
    ["15", ""], ["1.5", "2500"], ["0", "2500"], ["15", "-1"], ["15", "9999999999999999999999999"]]) {
    assert.equal(validatePricingOptionDrafts([{ label: "", durationMinutes, price }]).valid, false);
  }
  assert.equal(validatePricingOptionDrafts([]).valid, false);
});

test("model stores offers and serializer exposes every offer on public and merchant responses", async () => {
  const service = new Service({
    shop: new Types.ObjectId(), seller: new Types.ObjectId(), title: "Massage",
    pricingType: "fixed", price: 2500, durationMinutes: 15, pricingOptions: offers,
  });
  await service.validate();
  const out = serializeService(service.toObject());
  assert.deepEqual(out.pricingOptions, offers);
  assert.equal(out.price, 2500);
  assert.deepEqual(serializeService({ _id: new Types.ObjectId(), title: "Legacy" }).pricingOptions, []);
});

function loadController(file: string, dependencies: Record<string, unknown>) {
  const output: any = {};
  const js = ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", js)((id: string) => {
    assert.ok(id in dependencies, `Unexpected import ${id}`);
    return dependencies[id];
  }, output);
  return output;
}

function response() {
  return {
    code: 200, body: null as any,
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

test("real create/edit handlers round-trip offers, derive cheapest price, and remove all options", async () => {
  const shop = { _id: new Types.ObjectId(), sellerId: new Types.ObjectId(), kind: "services" };
  let stored: any;
  const lean = (value: unknown) => ({ lean: async () => value });
  const controller = loadController("artifacts/api-server/src/controllers/services.ts", {
    mongoose: { Types },
    "@workspace/db": {
      Shop: { findById: () => ({ select: () => lean(shop) }) },
      Service: {
        create: async (data: any) => { stored = { _id: new Types.ObjectId(), ...data }; return stored; },
        findById: () => ({ populate: () => lean(stored) }),
        findOne: () => ({ select: () => lean(stored) }),
        findOneAndUpdate: (_: any, update: any) => {
          stored = { ...stored, ...update };
          return { populate: () => lean(stored) };
        },
      },
    },
    "../lib/serialize": { serializeService },
    "../lib/service-pricing": { parseServicePricingOptions, cheapestServiceOption },
  }).servicesController;
  const params = { shopId: String(shop._id), id: String(new Types.ObjectId()) };
  const created = response();
  await controller.create({ params, body: { title: "Massage", pricingType: "fixed", price: 999, pricingOptions: offers } }, created);
  assert.equal(created.code, 200);
  assert.deepEqual(created.body.pricingOptions, offers);
  assert.equal(created.body.price, 2500);
  assert.equal(created.body.durationMinutes, 15);

  const photos = ["https://example.com/work-1.jpg", "https://example.com/work-2.jpg"];
  const gallery = response();
  await controller.update({ params, body: { photos } }, gallery);
  assert.deepEqual(gallery.body.photos, photos);
  const unchanged = response();
  await controller.update({ params, body: { description: "Past work" } }, unchanged);
  assert.deepEqual(unchanged.body.photos, photos, "omitting gallery must preserve it");
  const cleared = response();
  await controller.update({ params, body: { photos: [] } }, cleared);
  assert.deepEqual(cleared.body.photos, [], "all photos can be removed");
  for (const body of [
    { photos: ["file:///device/photo.jpg"] }, { photos: ["data:image/png;base64,abc"] },
    { photos: ["javascript:alert(1)"] }, { photos: [12] }, { photos: Array(21).fill(photos[0]) },
    { price: -1 }, { price: Infinity }, { durationMinutes: 0 }, { durationMinutes: 1.5 },
  ]) {
    for (const handler of ["create", "update"]) {
      const invalid = response();
      await controller[handler]({ params, body: { title: "Massage", pricingType: "fixed", ...body } }, invalid);
      assert.equal(invalid.code, 400);
    }
  }

  const modified = response();
  const nextOffers = [{ durationMinutes: 30, price: 4500 }, { durationMinutes: 60, price: 8000 }];
  await controller.update({ params, body: { pricingOptions: nextOffers } }, modified);
  assert.deepEqual(modified.body.pricingOptions.map(({ price, durationMinutes }: any) => ({ price, durationMinutes })), nextOffers);
  assert.equal(modified.body.price, 4500);
  assert.equal(modified.body.durationMinutes, 30);

  const rejected = response();
  await controller.update({ params, body: { pricingType: "hourly", pricingOptions: offers } }, rejected);
  assert.equal(rejected.code, 400);
  assert.equal(stored.pricingType, "fixed");

  const switched = response();
  await controller.update({ params, body: { pricingType: "quote" } }, switched);
  assert.deepEqual(switched.body.pricingOptions, []);

  const removed = response();
  await controller.update({ params, body: { pricingType: "fixed", pricingOptions: [], price: 300000, durationMinutes: 15 } }, removed);
  assert.deepEqual(removed.body.pricingOptions, []);
  assert.equal(removed.body.price, 300000); // Single-price legacy units are not migrated.
});

test("single-price fields accept French commas and cannot send zero/invalid durations to Mongoose", () => {
  assert.deepEqual(serviceFormValues("2500,50", "45", true), { price: 250050, durationMinutes: 45 });
  assert.deepEqual(serviceFormValues("", "", false), { price: null, durationMinutes: null });
  assert.deepEqual(serviceFormValues("0", "1", true), { price: 0, durationMinutes: 1 });
  for (const duration of ["0", "abc", "1.5", "-2", "45min"]) {
    assert.throws(() => serviceFormValues("2500", duration, true), /invalidDuration/);
  }
  for (const price of ["abc", "-1", "2,5,0", "Infinity", "2500F"]) {
    assert.throws(() => serviceFormValues(price, "45", true), /invalidPrice/);
  }
  assert.equal(serviceSaveError(new Error("HTTP 500 : <!DOCTYPE html><html>Error</html>"), "Retry"), "Retry");
  assert.equal(serviceSaveError(new Error("Photo storage unavailable"), "Retry"), "Photo storage unavailable");
});

test("a failed gallery upload never yields a partial gallery; retries reuse successful uploads", async () => {
  const cache = new Map<string, string>();
  const uploaded: string[] = [];
  let fail = true;
  const upload = async (uri: string) => {
    uploaded.push(uri);
    if (uri.endsWith("2") && fail) throw new Error("offline");
    return `https://example.com/${uri.slice(-1)}.jpg`;
  };
  const photos = ["https://example.com/existing.jpg", "file:///1", "file:///2"];
  await assert.rejects(prepareProductPhotos(photos, upload, cache), /offline/);
  fail = false;
  assert.deepEqual(await prepareProductPhotos(photos, upload, cache),
    ["https://example.com/existing.jpg", "https://example.com/1.jpg", "https://example.com/2.jpg"]);
  assert.deepEqual(uploaded, ["file:///1", "file:///2", "file:///2"]);
});

test("real Mongoose save middleware reaches insertion without callback-style next errors", async () => {
  const original = Service.collection.insertOne;
  let inserted: any;
  Service.collection.insertOne = (async (doc: any) => {
    inserted = doc;
    return { acknowledged: true, insertedId: doc._id };
  }) as typeof original;
  try {
    await new Service({
      shop: new Types.ObjectId(), seller: new Types.ObjectId(), title: "Réalisations massage",
      pricingType: "fixed", price: 2500, durationMinutes: 45, serviceLocation: "both",
      photos: ["https://example.com/past-work.jpg"],
    }).save();
    assert.equal(inserted.slug, "realisations-massage");
    assert.deepEqual(inserted.photos, ["https://example.com/past-work.jpg"]);
  } finally {
    Service.collection.insertOne = original;
  }
});

test("custom category creation is authenticated and shop-scoped, validates names and reuses existing categories", async () => {
  const router = source("artifacts/api-server/src/routes/services.ts");
  assert.ok(router.indexOf("router.use(requireAuth)") < router.indexOf('"/shops/:shopId/service-categories"'));
  assert.match(router, /service-categories", requireShopAccess, categoriesController.createService/);
  let stored: any;
  let writes = 0;
  let shopKind = "services";
  const controller = loadController("artifacts/api-server/src/controllers/categories.ts", {
    "@workspace/db": {
      Shop: { findById: () => ({ select: () => ({ lean: async () => ({ kind: shopKind }) }) }) },
      Category: {
        findOne: () => ({ lean: async () => stored }),
        findOneAndUpdate: (_: any, update: any) => ({ lean: async () => {
          writes++;
          stored = { _id: new Types.ObjectId(), ...update.$setOnInsert };
          return stored;
        } }),
      },
    },
    "node:crypto": await import("node:crypto"),
    "../lib/serialize": { serializeCategory: (c: any) => ({ id: String(c._id), name: c.name, kind: c.kind }) },
  }).categoriesController;
  const req = { params: { shopId: String(new Types.ObjectId()) }, body: { name: "  Réflexologie   plantaire " } };
  const created = response();
  await controller.createService(req, created);
  assert.equal(created.body.name, "Réflexologie plantaire");
  assert.equal(created.body.kind, "service");
  const repeated = response();
  await controller.createService(req, repeated);
  assert.equal(repeated.body.id, created.body.id);
  assert.equal(writes, 1);
  const invalid = response();
  await controller.createService({ ...req, body: { name: " " } }, invalid);
  assert.equal(invalid.code, 400);
  shopKind = "products";
  const forbidden = response();
  await controller.createService(req, forbidden);
  assert.equal(forbidden.code, 403);
});
