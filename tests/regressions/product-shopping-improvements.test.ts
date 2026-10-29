import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { optionValues, optionDraft } from "../../artifacts/nearbuy-business/lib/optionValues";
import { filterShopProducts, emptyProductFilters } from "../../artifacts/nearbuy/lib/shopProductFilters";
import type { PublicProduct } from "../../artifacts/nearbuy/lib/api/shops";
import { SearchPublicProductsQueryParams, SearchServicesQueryParams } from "../../lib/api-zod/src/generated/api";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
test("comma input splits complete values and keeps a single unfinished draft", () => {
  assert.deepEqual(optionDraft("Rouge, bleu, marron,"), { complete: ["Rouge", "bleu", "marron"], draft: "" });
  assert.deepEqual(optionDraft("S, M, L"), { complete: ["S", "M"], draft: " L" });
  assert.deepEqual(optionValues(["Rouge"], "Rouge, bleu, marron,"), ["Rouge", "bleu", "marron"]);
  assert.deepEqual(optionValues(["Rouge", " rouge ", "Rouge, bleu", "Rouge, bleu, marron"]), ["Rouge", "bleu", "marron"]);
  assert.deepEqual(optionValues(["S"], "M;L\nXL"), ["S", "M", "L", "XL"]);
});
test("product saving includes unsubmitted colors and sizes for both create and edit", () => {
  const source = read("artifacts/nearbuy-business/app/(home)/shops/[shopId]/add-product.tsx");
  assert.equal(source.match(/colors: optionValues\(colorsList, colorInput\)/g)?.length, 2);
  assert.equal(source.match(/sizes: optionValues\(sizesList, sizeInput\)/g)?.length, 2);
});
const products = [
  { id: "a", name: "Shirt long", brand: "Adidas", colors: ["Rouge", "bleu"], sizes: ["M"], categories: [{ id: "clothes", name: "Clothes" }] },
  { id: "b", name: "Shoes", brand: "Puma", colors: ["Noir"], sizes: ["L"], categories: [{ id: "shoes", name: "Shoes" }] },
  { id: "c", name: "Legacy product" },
] as PublicProduct[];
test("shop product filters combine name, category, color and size, preserving legacy products", () => {
  assert.equal(filterShopProducts(products, emptyProductFilters).length, 3);
  assert.deepEqual(filterShopProducts(products, { ...emptyProductFilters, name: " ADIDAS ", category: "clothes", color: "rouge", size: "m" }).map(p => p.id), ["a"]);
  assert.deepEqual(filterShopProducts(products, { ...emptyProductFilters, category: "clothes", size: "L" }), []);
  assert.deepEqual(filterShopProducts(products, { ...emptyProductFilters, name: "sh" }).map(p => p.id), ["a", "b"]);
});
test("product slideshow is identical in both apps and preserves full-gallery photo taps", () => {
  const client = read("artifacts/nearbuy/components/ProductGallery.tsx");
  assert.equal(client, read("artifacts/nearbuy-business/components/ProductGallery.tsx"));
  assert.match(client, /horizontal pagingEnabled/);
  assert.match(client, /photos=\{photos\}/);
  assert.match(client, /onMomentumScrollEnd/);
  assert.match(client, /\{index \+ 1\} \/ \{photos\.length\}/);
  const shop = read("artifacts/nearbuy/app/shop/[shopId].tsx");
  assert.doesNotMatch(shop, /product\.photos\.map/);
  assert.match(shop, /<ShopCatalog/);
  assert.match(read("artifacts/nearbuy/components/ShopCatalog.tsx"), /ProductGallery photos=\{item\.photos \?\? \[\]\}/);
});
test("price entry labels use only the selected shop currency, without euro or dollar literals", () => {
  for (const locale of ["en", "fr"]) {
    const translations = JSON.parse(read(`artifacts/nearbuy-business/lib/i18n/locales/${locale}.json`));
    assert.doesNotMatch(translations.addProduct.price, /[$€]/);
    assert.doesNotMatch(translations.newService.price, /[$€]/);
  }
  for (const screen of ["add-product", "add-service", "edit-service"]) {
    const source = read(`artifacts/nearbuy-business/app/(home)/shops/[shopId]/${screen}.tsx`);
    assert.match(source, /shop\?\.currency\?\.code/);
    assert.doesNotMatch(source, /currency\?\.code \?\? "USD"/);
  }
});
test("seller signup explicitly separates email and social forms with consent before provider actions", () => {
  const source = read("artifacts/nearbuy-business/app/(auth)/sign-up.tsx");
  assert.match(source, /signupMethod === "social" &&/);
  assert.match(source, /signupMethod === "email" &&/);
  assert.match(source, /signup-method-social/);
  assert.match(source, /signup-method-email/);
  assert.equal(source.match(/<ConsentCheckbox/g)?.length, 1);
  assert.ok(source.indexOf("<ConsentCheckbox") < source.indexOf('title={t("auth.continueGoogle")}'));
  assert.match(source, /disabled=\{!hasLocation \|\| !acceptedTerms\}/);
});
test("text product and service search validators accept every Marketplace distance up to 400 km", () => {
  for (const radiusKm of [5, 32, 64, 96, 160, 400]) {
    assert.ok(SearchPublicProductsQueryParams.safeParse({ q: "shirt", lat: 6, lng: 1, radiusKm }).success);
    assert.ok(SearchServicesQueryParams.safeParse({ latitude: 6, longitude: 1, radiusKm }).success);
  }
  assert.equal(SearchServicesQueryParams.safeParse({ latitude: 6, longitude: 1, radiusKm: 401 }).success, false);
  assert.equal(SearchPublicProductsQueryParams.safeParse({ q: "shirt", lat: 6, lng: 1, radiusKm: 401 }).success, false);
});
