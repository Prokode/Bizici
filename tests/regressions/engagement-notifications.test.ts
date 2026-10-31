import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import test from "node:test";
import ts from "typescript";
import { Types } from "mongoose";
import { SetMyInterestsBody, SetMyFavoriteShopBody } from "../../lib/api-zod/src/generated/api";
import { notificationTarget } from "../../artifacts/nearbuy/lib/notificationTarget";
import { notificationTarget as businessTarget } from "../../artifacts/nearbuy-business/lib/notificationTarget";
import { AppNotification, ShopFavorite } from "../../lib/db/src/models/Engagement";

const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const express = require("express");
const id = () => String(new Types.ObjectId());
const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
function load(path: string, dependencies: Record<string, unknown>) {
  const output: any = {};
  const js = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", js)((name: string) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, output);
  return output;
}
const query = (value: unknown) => ({ select() { return this; }, lean: async () => value });

function engine() {
  const seller = id(), actor = id(), favorite = id(), interested = id(), foreign = id(), country = id(), category = id(), parent = id();
  const shopId = id(), itemId = id();
  const shop: any = { name: "Atelier", sellerId: seller, countryCode: "TG" };
  let item: any = { name: "Produit", categories: [category], updatedAt: new Date("2026-10-31T12:00:00Z"), price: 1000 };
  const store = new Map<string, any>();
  const pushes: string[][] = [];
  const errors: unknown[] = [];
  const preferences = [
    { _id: interested, country, interestCategoryIds: [parent] },
    { _id: favorite, country, interestCategoryIds: [category] },
    { _id: foreign, country: id(), interestCategoryIds: [category] },
  ];
  const api = load("artifacts/api-server/src/lib/notifications.ts", {
    mongoose: { Types },
    "@workspace/db": {
      Shop: { findById: () => query(shop) },
      Product: { findById: () => query(item) },
      Service: { findById: () => query(item) },
      Country: { findOne: (where: any) => query(where.cca2 === "TG" ? { _id: country } : null) },
      Category: { find: (where: any) => query(where._id.$in.includes(category) ? [{ parent }] : []) },
      ShopFavorite: { find: () => query([{ userId: favorite }, { userId: seller }, { userId: actor }]) },
      User: { find: (where: any) => query(preferences.filter((u) => u.country === String(where.country) &&
        u.interestCategoryIds.some((cat) => where.interestCategoryIds.$in.includes(cat)))) },
      AppNotification: {
        insertMany: async (rows: any[]) => {
          const inserted = [];
          let duplicate = false;
          for (const row of rows) {
            const key = `${row.userId}:${row.eventKey}`;
            if (store.has(key)) { duplicate = true; continue; }
            store.set(key, row); inserted.push(row);
          }
          if (duplicate) throw Object.assign(new Error("duplicate"), { code: 11000, insertedDocs: inserted });
          return inserted;
        },
      },
    },
    "./push": { sendPushToUsers: async (ids: string[]) => { pushes.push(ids); } },
    "./logger": { logger: { error: (value: unknown) => errors.push(value) } },
  });
  return {
    ...api, seller, actor, favorite, interested, foreign, shop, shopId, itemId, store, pushes, errors,
    get item() { return item; }, setItem: (value: any) => { item = value; },
    event: (action = "created", kind = "product", before?: any) =>
      api.notifyCatalogChange({ action, kind, shopId, itemId, actorId: actor, before }),
  };
}

test("new publications union favorites and same-country category interests, including parent categories", async () => {
  const e = engine();
  await e.event();
  assert.deepEqual([...e.store.values()].map((row) => row.userId).sort(), [e.favorite, e.interested].sort());
  assert.ok(!e.pushes.flat().includes(e.foreign));
  assert.ok(!e.pushes.flat().includes(e.actor));
  assert.ok(!e.pushes.flat().includes(e.seller));
  assert.equal(e.pushes.flat().filter((user: string) => user === e.favorite).length, 1);
  await e.event();
  assert.equal(e.store.size, 2, "replayed events cannot duplicate the inbox");
  assert.equal(e.pushes.flat().length, 2, "replayed events cannot duplicate pushes");
  assert.deepEqual(e.errors, []);
});

test("edits/deletions notify favorites only; metadata-only and unchanged saves are silent", async () => {
  const e = engine();
  await e.event("updated", "product", { ...e.item });
  assert.equal(e.store.size, 0);
  await e.event("updated", "product", { ...e.item, price: 2000 });
  assert.deepEqual(e.pushes.flat(), [e.favorite]);
  await e.event("deleted");
  assert.equal(e.store.size, 2);
  assert.equal(e.catalogHasChanged("product", { ...e.item }, { ...e.item, updatedAt: new Date(), lastVerifiedAt: new Date() }), false);
});

test("missing country never broadcasts interests; unpublished services stay silent until activation", async () => {
  const e = engine();
  e.shop.countryCode = null;
  await e.event();
  assert.deepEqual(e.pushes.flat(), [e.favorite]);
  const service = engine();
  service.setItem({ title: "Massage", categories: service.item.categories, updatedAt: new Date(), isActive: false });
  await service.event("created", "service");
  assert.equal(service.store.size, 0);
  const before = service.item;
  service.setItem({ ...before, isActive: true });
  await service.event("updated", "service", before);
  assert.equal(service.store.size, 2);
});

test("favorite and notification event uniqueness are database-enforced", () => {
  assert.ok(ShopFavorite.schema.indexes().some(([fields, options]) => fields.userId === 1 && fields.shopId === 1 && options.unique));
  assert.ok(AppNotification.schema.indexes().some(([fields, options]) => fields.userId === 1 && fields.eventKey === 1 && options.unique));
});

test("notification navigation validates payloads and respects each app's real chat route", () => {
  const shopId = id(), conversationId = id();
  assert.equal(notificationTarget({ type: "chat_message", conversationId }), `/chat/${conversationId}`);
  assert.equal(businessTarget({ type: "chat_message", conversationId, shopId }), `/(home)/shops/${shopId}/chat/${conversationId}`);
  assert.equal(notificationTarget({ type: "catalog_change", itemKind: "service", shopId }), `/provider/${shopId}`);
  assert.equal(notificationTarget({ type: "catalog_change", itemKind: "product", shopId }), `/shop/${shopId}`);
  for (const invalid of [undefined, { type: "chat_message", conversationId: "../../admin" }, { type: "catalog_change", shopId: "https://evil.com" }]) {
    assert.equal(notificationTarget(invalid), null);
  }
});

test("engagement HTTP routes persist account-specific interests/favorites and protect inbox reads", async (t) => {
  const account = id(), other = id(), shopId = id(), category = id();
  const prefs = new Map<string, any>();
  const favorites = new Map<string, any>();
  const notifications: any[] = [
    { _id: new Types.ObjectId(), userId: account, type: "catalog_change", title: "Shop", body: "New item",
      shopId, createdAt: new Date(), readAt: null, conversationId: null, itemId: id(), itemKind: "product", action: "created" },
    { _id: new Types.ObjectId(), userId: other, type: "chat_message", shopId, readAt: null },
  ];
  const scoped = (filter: any) => notifications.filter((n) => n.userId === filter.userId &&
    (!filter._id || String(n._id) === String(filter._id)) && (!("readAt" in filter) || n.readAt === filter.readAt));
  const router = load("artifacts/api-server/src/routes/engagement.ts", {
    express: { Router: express.Router }, mongoose: { Types },
    "@workspace/api-zod": { SetMyInterestsBody, SetMyFavoriteShopBody },
    "../lib/kyc-policy": { publicShopKycFilter: () => ({}) },
    "../lib/auth": { requireAuth: (req: any, res: any, next: () => void) => {
      req.userId = req.headers["x-test-user"];
      if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
      next();
    } },
    "@workspace/db": {
      User: {
        findById: (userId: string) => query(prefs.get(userId)),
        updateOne: async (where: any, update: any) => { prefs.set(where._id, update.$set); },
      },
      Category: { countDocuments: async (where: any) => where._id.$in.filter((value: string) => value === category).length },
      Shop: { exists: async (where: any) => where._id === shopId },
      ShopFavorite: {
        updateOne: async (where: any) => { favorites.set(`${where.userId}:${where.shopId}`, where); },
        deleteOne: async (where: any) => { favorites.delete(`${where.userId}:${where.shopId}`); },
        find: (where: any) => ({
          sort() { return this; }, populate() { return this; },
          lean: async () => [...favorites.values()].filter((f) => f.userId === where.userId)
            .map((f) => ({ ...f, shopId: { _id: f.shopId, name: "Shop", kind: "products" } })),
        }),
      },
      AppNotification: {
        find: (where: any) => ({ sort() { return this; }, limit() { return this; }, lean: async () => scoped(where) }),
        countDocuments: async (where: any) => scoped(where).length,
        updateOne: async (where: any, update: any) => {
          const rows = scoped(where); rows.forEach((n) => Object.assign(n, update.$set));
          return { matchedCount: rows.length };
        },
        updateMany: async (where: any, update: any) => { scoped(where).forEach((n) => Object.assign(n, update.$set)); },
      },
    },
  }).default;
  const app = express(); app.use(express.json()); app.use("/api", router);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  const request = (path: string, method = "GET", data?: unknown, user = account) =>
    fetch(base + path, { method, headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  assert.equal((await request("/me/notifications", "GET", undefined, "")).status, 401);
  assert.deepEqual(await (await request("/me/interests")).json(), { categoryIds: [], configured: false });
  assert.equal((await request("/me/interests", "PUT", { categoryIds: ["bad"] })).status, 400);
  assert.equal((await request("/me/interests", "PUT", { categoryIds: [id()] })).status, 400);
  assert.deepEqual(await (await request("/me/interests", "PUT", { categoryIds: [category, category] })).json(),
    { categoryIds: [category], configured: true });
  assert.deepEqual(await (await request("/me/interests", "GET", undefined, other)).json(), { categoryIds: [], configured: false });
  assert.deepEqual(await (await request("/me/interests", "PUT", { categoryIds: [] })).json(), { categoryIds: [], configured: true });
  for (let i = 0; i < 2; i++) assert.equal((await request(`/me/favorites/${shopId}`, "PUT", { favorite: true })).status, 200);
  assert.equal(favorites.size, 1);
  assert.equal((await (await request("/me/favorites")).json()).length, 1);
  await request(`/me/favorites/${shopId}`, "PUT", { favorite: false });
  assert.equal(favorites.size, 0);
  const inbox = await (await request("/me/notifications")).json();
  assert.equal(inbox.items.length, 1); assert.equal(inbox.unreadCount, 1);
  assert.equal((await request(`/me/notifications/${notifications[1]._id}/read`, "POST")).status, 404);
  await request("/me/notifications/read-all", "POST");
  assert.ok(notifications[0].readAt);
  assert.equal(notifications[1].readAt, null, "read-all cannot affect another account");
});
