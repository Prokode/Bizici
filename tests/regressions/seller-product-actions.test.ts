import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (path: string) => readFileSync(new URL(`../../artifacts/nearbuy-business/${path}`, import.meta.url), "utf8");

test("inventory exposes edit and confirmed deletion with pending/error handling and cache refresh", () => {
  const source = read("app/(home)/shops/[shopId]/(tabs)/index.tsx");
  for (const pattern of [
    /title=\{t\("inventory\.edit"\)\}/, /title=\{t\("inventory\.delete"\)\}/,
    /productId: id/, /useDeleteProduct/, /Alert\.alert\(title, message/,
    /window\.confirm/, /loading=\{deletingId === item\.id\}/,
    /setDeleteErrorId\(item\.id\)/, /old\?\.filter/, /getGetShopSummaryQueryKey/,
  ]) assert.match(source, pattern);
});

test("edit mode preloads the existing product and patches instead of creating duplicates", () => {
  const source = read("app/(home)/shops/[shopId]/add-product.tsx");
  assert.match(source, /productId/);
  assert.match(source, /initializedForId\.current === editingProduct\.id/);
  assert.match(source, /setPriceStr\(p\.price != null \? \(p\.price \/ 100\)/);
  const update = source.slice(source.indexOf("updateProduct.mutate("), source.indexOf("createProduct.mutate("));
  for (const field of ["name:", "brand:", "description:", "price:", "quantity,", "tags,", "colors:", "sizes:", "categoryIds,", "photos: resolvedPhotos"]) assert.ok(update.includes(field), field);
  assert.doesNotMatch(update, /stockStatus:|applyDiscount:|variations:/);
  assert.match(update, /return;/);
});

test("shop configuration actions and button content can shrink without clipping labels", () => {
  const source = read("app/(home)/shops/[shopId]/(tabs)/profile.tsx");
  assert.match(source, /numberOfLines=\{2\}/);
  assert.match(source, /showQr/);
  const button = read("components/ui/Button.tsx");
  assert.match(button, /flexShrink: 1/);
  assert.match(source, /minWidth: 0/);
});
