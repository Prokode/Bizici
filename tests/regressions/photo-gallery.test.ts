import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { galleryPhotos, gallerySwipeDirection } from "../../artifacts/nearbuy/lib/photoGallery";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("gallery preserves photo order and opens any selected product photo", () => {
  const photos = ["first.jpg", "second.jpg", "third.jpg"];
  const gallery = galleryPhotos(photos, "second.jpg");
  assert.deepEqual(gallery, photos);
  assert.equal(gallery.indexOf("second.jpg"), 1);
  assert.deepEqual(galleryPhotos(photos, "cover.jpg"), ["cover.jpg", ...photos]);
});
test("gallery handles missing, repeated, local and malformed legacy photos", () => {
  assert.deepEqual(galleryPhotos(undefined, "only.jpg"), ["only.jpg"]);
  assert.deepEqual(galleryPhotos(["", "a.jpg", "a.jpg", "  "], "a.jpg"), ["a.jpg"]);
  assert.deepEqual(galleryPhotos(["file:///one.jpg", "file:///two.jpg"], "file:///two.jpg"), ["file:///one.jpg", "file:///two.jpg"]);
  assert.deepEqual(galleryPhotos(null as unknown as string[], "only.jpg"), ["only.jpg"]);
});
test("horizontal swipes navigate gallery but never replace zoomed-image panning", () => {
  assert.equal(gallerySwipeDirection(-120, 5, 1, true, true), 1);
  assert.equal(gallerySwipeDirection(120, 5, 1, true, true), -1);
  assert.equal(gallerySwipeDirection(-120, 5, 2, true, true), 0);
  assert.equal(gallerySwipeDirection(120, 5, 5, true, true), 0);
});
test("gallery swipes respect boundaries and ignore accidental and vertical gestures", () => {
  assert.equal(gallerySwipeDirection(120, 5, 1, false, true), 0);
  assert.equal(gallerySwipeDirection(-120, 5, 1, true, false), 0);
  assert.equal(gallerySwipeDirection(-40, 5, 1, true, true), 0);
  assert.equal(gallerySwipeDirection(-120, 200, 1, true, true), 0);
});
test("viewer and helper remain identical across mobile apps, with translations in all locales", () => {
  for (const file of ["components/PhotoViewer.tsx", "components/ZoomablePhoto.tsx", "components/BrandPhoto.tsx", "lib/photoGallery.ts"]) {
    assert.equal(read(`artifacts/nearbuy/${file}`), read(`artifacts/nearbuy-business/${file}`), file);
  }
  for (const lang of ["en", "fr"]) {
    const customer = JSON.parse(read(`artifacts/nearbuy/lib/i18n/locales/${lang}.json`)).photoViewer;
    const seller = JSON.parse(read(`artifacts/nearbuy-business/lib/i18n/locales/${lang}.json`)).photoViewer;
    assert.deepEqual(customer, seller);
    for (const key of ["open", "hint", "zoomIn", "zoomOut", "reset", "next", "previous", "count", "loadError"]) assert.ok(customer[key]);
  }
});
test("viewer supports pinch, pan, double-tap, close/back, web escape and full-image contain", () => {
  const viewer = read("artifacts/nearbuy/components/PhotoViewer.tsx");
  for (const pattern of [/Gesture\.Pinch/, /Gesture\.Pan/, /numberOfTaps\(2\)/, /onRequestClose=\{onClose\}/, /event\.key === "Escape"/, /resizeMode="contain"/, /clamp\(startScale\.value \* event\.scale, 1, 5\)/, /key=\{`\$\{index\}/]) assert.match(viewer, pattern);
  assert.match(read("artifacts/nearbuy/components/ZoomablePhoto.tsx"), /event\.stopPropagation\(\)/);
});
test("product surfaces supply full galleries and search previews resolve their product's real photos", () => {
  assert.match(read("artifacts/nearbuy/app/shop/[shopId].tsx"), /<ShopCatalog/);
  assert.match(read("artifacts/nearbuy/components/ShopCatalog.tsx"), /photos=\{item\.photos \?\? \[\]\}/);
  assert.match(read("artifacts/nearbuy/components/ShopBottomSheet.tsx"), /photos=\{item\.photos\}/);
  assert.match(read("artifacts/nearbuy-business/app/(home)/shops/[shopId]/add-product.tsx"), /photos=\{photos\}/);
  const productPhoto = read("artifacts/nearbuy/components/ProductPhoto.tsx");
  assert.match(productPhoto, /fetchShopDetail\(shopId, \{ signal \}\)/);
  assert.match(productPhoto, /item\.id === productId/);
  assert.match(productPhoto, /return product\.photos/);
});
