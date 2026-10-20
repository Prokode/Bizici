import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { brandPhotoPath, detectBrandPhotoType, validBrandPhotoId } from "../../artifacts/api-server/src/lib/shopBrandPhotoStorage";
import { resolveBrandPhotoUrl } from "../../artifacts/nearbuy/lib/brandPhoto";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const id = "ed530a40-60a6-4ec0-b7e7-7a67d25801f7";

test("shop brand photos use bounded object ids, never device paths or arbitrary bucket paths", () => {
  assert.equal(validBrandPhotoId(id), true);
  for (const invalid of [null, "", "../private", `${id}/../other`, "file:///phone.jpg", "https://example.com/image"]) {
    assert.equal(validBrandPhotoId(invalid), false);
  }
  assert.equal(brandPhotoPath("0123456789abcdef01234567", id), `/api/public/shops/0123456789abcdef01234567/brand-photo/${id}`);
});

test("brand photo verification sniffs JPEG, PNG and WebP and rejects executable/non-image payloads", () => {
  assert.equal(detectBrandPhotoType(Uint8Array.from([255, 216, 255, 224])), "image/jpeg");
  assert.equal(detectBrandPhotoType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(detectBrandPhotoType(Buffer.from("RIFF1234WEBP")), "image/webp");
  for (const input of ["<svg><script>alert(1)</script></svg>", "<html>", "not an image", ""]) {
    assert.equal(detectBrandPhotoType(Buffer.from(input)), null);
  }
});

test("brand photo display resolves API paths against the configured backend, not the device", () => {
  assert.equal(resolveBrandPhotoUrl("/api/public/shops/photo", "api.example.test"), "https://api.example.test/api/public/shops/photo");
  assert.equal(resolveBrandPhotoUrl("https://cdn.example.test/photo.png", "api.example.test"), "https://cdn.example.test/photo.png");
  for (const invalid of [undefined, null, "", "file:///local/photo.jpg", "../private", "javascript:alert(1)"]) {
    assert.equal(resolveBrandPhotoUrl(invalid, "api.example.test"), null);
  }
  assert.equal(resolveBrandPhotoUrl("/api/photo", undefined), null);
});

test("brand photo changes are shop-owner-only and public reads expose only the current shop image", () => {
  const source = read("artifacts/api-server/src/routes/shop-brand-photo.ts");
  assert.equal((source.match(/requireAuth, requireShopAccess, requireSeller/g) ?? []).length, 2);
  assert.match(source, /shop\.brandPhotoUrl !== brandPhotoPath\(shopId, photoId\)/);
  assert.match(source, /verifyBrandPhoto\(shopId/);
  assert.match(source, /photoId === null \? null/);
  assert.match(read("artifacts/api-server/src/lib/serialize.ts"), /brandPhotoUrl: s\.brandPhotoUrl \?\? null/);
  assert.match(read("artifacts/nearbuy-business/app/(home)/shops/[shopId]/(tabs)/profile.tsx"), /isSeller &&.*ShopBrandPhotoSettings/s);
});

test("settings save only verified uploads and update both shop and shop-list caches", () => {
  const helper = read("artifacts/nearbuy-business/lib/shopBrandPhoto.ts");
  assert.ok(helper.indexOf("await uploadFetch") < helper.indexOf("return setShopBrandPhoto"));
  assert.match(helper, /if \(!response\.ok\) throw/);
  assert.match(helper, /photoId: null/);
  const settings = read("artifacts/nearbuy-business/components/ShopBrandPhotoSettings.tsx");
  assert.match(settings, /getGetShopQueryKey\(shopId\)/);
  assert.match(settings, /getListShopsQueryKey\(\)/);
  assert.match(settings, /Alert\.alert/);
  assert.match(settings, /window\.confirm/);
});

test("all four client shop/service views consume the shop brand photo", () => {
  for (const path of [
    "components/ShopBottomSheet.tsx", "components/ProviderBottomCard.tsx",
    "app/shop/[shopId].tsx", "app/provider/[shopId].tsx",
  ]) {
    const source = read(`artifacts/nearbuy/${path}`);
    assert.match(source, /BrandPhoto/);
    assert.match(source, /brandPhotoUrl/);
  }
  assert.equal(read("artifacts/nearbuy/components/BrandPhoto.tsx"), read("artifacts/nearbuy-business/components/BrandPhoto.tsx"));
  assert.equal(read("artifacts/nearbuy/lib/brandPhoto.ts"), read("artifacts/nearbuy-business/lib/brandPhoto.ts"));
  assert.doesNotMatch(read("artifacts/nearbuy/components/ShopBottomSheet.tsx"), /brandPhotoUrl \?\? shop\.brandPhotoUrl/);
  for (const app of ["nearbuy", "nearbuy-business"]) {
    for (const lang of ["en", "fr"]) {
      const messages = JSON.parse(read(`artifacts/${app}/lib/i18n/locales/${lang}.json`)).shopBrandPhoto;
      for (const key of ["title", "choose", "replace", "remove", "uploadError", "removeError", "alt"]) assert.ok(messages[key]);
    }
  }
});
