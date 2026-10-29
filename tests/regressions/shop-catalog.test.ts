import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { sortCatalogNewest, sortCatalogMostLiked, filterCatalogCategory } from "../../artifacts/nearbuy/lib/catalogSections";
import { CatalogLike } from "../../lib/db/src/models/CatalogLike";
import { Product, Service, Shop } from "../../lib/db/src/models";
import { Types } from "mongoose";
import { createRequire } from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = (file: string) => readFileSync(root + file, "utf8");
const items = Array.from({ length: 15 }, (_, i) => ({
  id: String(i).padStart(2, "0"),
  createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
  categories: [{ id: i % 2 ? "clothing" : "food" }],
}));
test("new items are ordered by creation, not edits; cap is ten and input stays unchanged", () => {
  const newest = sortCatalogNewest(items).slice(0, 10);
  assert.equal(newest.length, 10);
  assert.equal(newest[0].id, "14");
  assert.equal(newest[9].id, "05");
  assert.equal(items[0].id, "00");
});
test("liked rail uses actual positive counts, descending, with deterministic ties and ten maximum", () => {
  const liked = sortCatalogMostLiked(items, item => ({ likeCount: Number(item.id), likedByMe: false })).slice(0, 10);
  assert.equal(liked[0].id, "14");
  assert.equal(liked.length, 10);
  assert.deepEqual(sortCatalogMostLiked(items, () => ({ likeCount: 0, likedByMe: false })), []);
  assert.deepEqual(sortCatalogMostLiked([{ id: "b" }, { id: "a" }], () => ({ likeCount: 2, likedByMe: false })).map(x => x.id), ["a", "b"]);
});
test("category filters only the all-items collection and All restores every item", () => {
  assert.equal(filterCatalogCategory(items, "food").length, 8);
  assert.equal(filterCatalogCategory(items, "clothing").length, 7);
  assert.deepEqual(filterCatalogCategory(items, "missing"), []);
  assert.equal(filterCatalogCategory(items, "").length, 15);
  assert.equal(sortCatalogNewest(items).length, 15);
});
test("missing or malformed creation dates are stable and do not mutate input", () => {
  const mixed = [{ id: "b", createdAt: "invalid" }, { id: "c", createdAt: "2026-01-01" }, { id: "a" }];
  assert.deepEqual(sortCatalogNewest(mixed).map(x => x.id), ["c", "a", "b"]);
  assert.equal(mixed[0].id, "b");
});
test("durable likes enforce one vote per account per product/service", () => {
  const indexes = CatalogLike.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.kind === 1 && keys.item === 1 && keys.user === 1 && options.unique));
  assert.deepEqual(CatalogLike.schema.path("kind").options.enum, ["product", "service"]);
});
test("both routes place catalog after currency preference and retain contextual chat", () => {
  for (const route of ["shop", "provider"]) {
    const code = source(`artifacts/nearbuy/app/${route}/[shopId].tsx`);
    assert.ok(code.indexOf("<CurrencyPreference") < code.indexOf("<ShopCatalog"));
    assert.match(code, /chatShopHref\(shop\.id, \{ kind: "service"/);
  }
  const ui = source("artifacts/nearbuy/components/ShopCatalog.tsx");
  assert.equal((ui.match(/\.slice\(0, 10\)/g) ?? []).length, 4);
  assert.match(ui, /horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(ui, /gridCard: \{ width: "48%", flexGrow: 0/);
  assert.match(ui, /item\.price \* 100/);
  assert.ok(ui.includes("<ProductGallery photos={item.photos ?? []}"));
  assert.match(ui, /heart: \{ alignSelf: "flex-end", minWidth: 44, height: 44/);
  assert.ok(ui.indexOf("</View>", ui.indexOf("<ProductGallery")) < ui.indexOf('testID={`catalog-like-'));
});
test("like endpoint precedes blanket auth routers; mutations require auth and are idempotent", () => {
  const routes = source("artifacts/api-server/src/routes/index.ts");
  assert.ok(routes.indexOf("router.use(catalogLikesRouter)") < routes.indexOf("router.use(meRouter)"));
  const api = source("artifacts/api-server/src/routes/catalog-likes.ts");
  assert.match(api, /router\.put\("\/catalog\/:kind\/:itemId\/like", requireAuth/);
  assert.match(api, /typeof req\.body\?\.liked !== "boolean"/);
  assert.match(api, /\$setOnInsert/);
  assert.match(api, /CatalogLike\.deleteOne\(vote\)/);
  assert.match(api, /private, no-store/);
});
test("viewer caches are account scoped and rapid taps are guarded until saved", () => {
  const hook = source("artifacts/nearbuy/lib/useCatalogLikes.ts");
  assert.match(hook, /userId \?\? "anonymous"/);
  assert.match(hook, /pending\.current\.has\(key\)/);
  assert.match(hook, /refetchInterval: 30_000/);
  assert.match(hook, /encodeURIComponent\(returnTo\)/);
  assert.ok(hook.indexOf("await setCatalogLike") < hook.indexOf("queryClient.setQueryData"));
});

test("vote handler saves, reloads, deduplicates and removes account votes for products and services", async (context) => {
  // Exercise the real handler with an isolated repository; no live customer data
  // or Clerk credentials are needed for this persistence-contract test.
  const shop = { _id: new Types.ObjectId(), kyc: { status: "approved" } };
  let visible = true;
  const item = { shop: shop._id };
  const query = (value: unknown) => ({ select: () => ({ lean: async () => value }) });
  context.mock.method(Product, "findOne", () => query(visible ? item : null));
  context.mock.method(Service, "findOne", () => query(visible ? item : null));
  context.mock.method(Shop, "findById", () => ({ lean: async () => shop }));
  context.mock.method(CatalogLike, "init", async () => CatalogLike);
  const rows = new Map<string, { kind: string; item: string; user: string }>();
  const key = (value: any) => `${value.kind}:${value.item}:${value.user}`;
  context.mock.method(CatalogLike, "updateOne", async (vote: any) => {
    rows.set(key(vote), { kind: vote.kind, item: String(vote.item), user: String(vote.user) });
  });
  context.mock.method(CatalogLike, "deleteOne", async (vote: any) => { rows.delete(key(vote)); });
  context.mock.method(CatalogLike, "countDocuments", async (target: any) =>
    [...rows.values()].filter(row => row.kind === target.kind && row.item === String(target.item)).length);
  context.mock.method(CatalogLike, "exists", async (vote: any) => rows.has(key(vote)) ? { _id: vote.user } : null);
  // Isolate the route from the DB barrel's release-only seed-file loader.
  // Production auth is covered separately by the real anonymous HTTP 401 check.
  const exported: { default?: any } = {};
  const backendRequire = createRequire(root + "artifacts/api-server/package.json");
  const compiled = ts.transpileModule(source("artifacts/api-server/src/routes/catalog-likes.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", compiled)((id: string) => {
    if (id === "@workspace/db") return { CatalogLike, Product, Service, Shop };
    if (id === "../lib/auth") return { requireAuth: () => undefined };
    if (id === "../lib/kyc-policy") return { isPublicShopKycAllowed: () => true };
    return backendRequire(id);
  }, exported);
  const catalogLikesRouter = exported.default;
  const layer = catalogLikesRouter.stack.find((entry: any) => entry.route?.path === "/catalog/:kind/:itemId/like") as any;
  const handler = layer.route.stack.at(-1).handle;
  const itemId = new Types.ObjectId().toString();
  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const invoke = async (kind: string, userId: string, liked: unknown) => {
    let status = 200;
    let body: any;
    const res = { set: () => res, status: (code: number) => { status = code; return res; }, json: (data: unknown) => { body = data; } };
    await handler({ params: { kind, itemId }, userId, body: { liked } }, res);
    return { status, body };
  };
  for (const kind of ["product", "service"]) {
    assert.deepEqual((await invoke(kind, userA, true)).body, { id: itemId, kind, likeCount: 1, likedByMe: true });
    assert.equal((await invoke(kind, userA, true)).body.likeCount, 1);
    assert.equal((await invoke(kind, userB, true)).body.likeCount, 2);
    assert.deepEqual((await invoke(kind, userA, false)).body, { id: itemId, kind, likeCount: 1, likedByMe: false });
    assert.equal((await invoke(kind, userA, false)).body.likeCount, 1);
    assert.equal((await invoke(kind, userB, false)).body.likeCount, 0);
  }
  assert.equal(rows.size, 0);
  assert.equal((await invoke("product", userA, "true")).status, 400);
  assert.equal((await invoke("unknown", userA, true)).status, 400);
  visible = false;
  assert.equal((await invoke("product", userA, true)).status, 404);
  assert.equal(rows.size, 0);
});
