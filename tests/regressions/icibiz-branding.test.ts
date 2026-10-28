import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const apps = ["nearbuy", "nearbuy-business"];

test("mobile display names change without breaking installed app identity", () => {
  for (const app of apps) {
    const expo = JSON.parse(read(`artifacts/${app}/app.json`)).expo;
    const pro = app === "nearbuy-business";
    assert.equal(expo.name, pro ? "iciBiz Pro" : "iciBiz");
    assert.equal(expo.slug, app);
    assert.equal(expo.scheme, pro ? "bizici-pro" : "bizici");
    assert.equal(expo.ios.bundleIdentifier, pro ? "com.bizici.pro" : "com.bizici.app");
    assert.equal(expo.android.package, expo.ios.bundleIdentifier);
    assert.ok(expo.extra.eas.projectId);
    for (const asset of [expo.icon, expo.splash.image, expo.web.favicon, expo.android.adaptiveIcon.foregroundImage]) {
      assert.match(asset, /icibiz-/);
      assert.ok(existsSync(path.join(root, "artifacts", app, asset)));
    }
    assert.equal(expo.android.adaptiveIcon.backgroundColor, "#FFF8E9");
    assert.ok(!JSON.stringify(expo.plugins).includes("BizIci"));
  }
});

test("mobile launcher images are 1024 square RGB without transparency", () => {
  for (const app of apps) {
    const png = readFileSync(path.join(root, `artifacts/${app}/assets/images/icibiz-icon.png`));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 1024);
    assert.equal(png.readUInt32BE(20), 1024);
    assert.equal(png[25], 2);
  }
});

test("customer and seller use identical approved icon and mark assets", () => {
  for (const file of ["icibiz-icon.png", "icibiz-mark.png", "icibiz-adaptive.png", "icibiz-notification.png"]) {
    const buffers = apps.map(app => readFileSync(path.join(root, `artifacts/${app}/assets/images/${file}`)));
    assert.deepEqual(buffers[0], buffers[1]);
  }
});

test("all four app locales and shared legal copy use the new public brand", () => {
  for (const app of apps) {
    for (const locale of ["fr", "en"]) {
      const text = read(`artifacts/${app}/lib/i18n/locales/${locale}.json`);
      assert.ok(text.includes("iciBiz"));
      assert.ok(!text.includes("BizIci"));
      JSON.parse(text);
    }
  }
  const legal = read("lib/legal-content/src/index.ts");
  assert.ok(legal.includes("iciBiz"));
  assert.ok(!legal.includes("BizIci"));
});

test("web metadata and asset URLs respect prefixed artifact routes", () => {
  for (const app of ["nearbuy-site", "nearbuy-admin"]) {
    const html = read(`artifacts/${app}/index.html`);
    assert.match(html, /<title>iciBiz/);
    assert.match(html, /href="%BASE_URL%favicon.svg"/);
    assert.ok(!html.includes("BizIci"));
    assert.ok(existsSync(path.join(root, `artifacts/${app}/public/icibiz-mark.svg`)));
    for (const locale of ["fr", "en"]) {
      const copy = read(`artifacts/${app}/src/i18n/locales/${locale}.json`);
      assert.ok(copy.includes("iciBiz"));
      assert.ok(!copy.includes("BizIci"));
    }
  }
});

test("mobile splash is bounded, motion-aware and safe under effect remounts", () => {
  for (const app of apps) {
    const splash = read(`artifacts/${app}/components/AnimatedSplash.tsx`);
    assert.match(splash, /icibiz-mark\.png/);
    assert.match(splash, /reduceMotionChanged/);
    assert.match(splash, /completedRef\.current/);
    assert.match(splash, /startedRef\.current = false/);
    assert.ok(Number(splash.match(/const FINISH_MS = (\d+)/)?.[1]) <= 2400);
    assert.ok(Number(splash.match(/const REDUCED_FINISH_MS = (\d+)/)?.[1]) <= 800);
    assert.ok(!splash.includes("BizIci"));
  }
});

test("web splash has a reduced-motion version and prefix-safe approved mark", () => {
  for (const app of ["nearbuy-site", "nearbuy-admin"]) {
    const splash = read(`artifacts/${app}/src/components/AnimatedSplash.tsx`);
    const css = read(`artifacts/${app}/src/components/AnimatedSplash.css`);
    assert.match(splash, /import\.meta\.env\.BASE_URL/);
    assert.match(splash, /icibiz-mark\.svg/);
    assert.match(splash, /aria-hidden="true"/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /pointer-events: none/);
  }
});

test("ici stays green and Biz terracotta in the mobile and vector wordmarks", () => {
  for (const app of apps) {
    assert.match(read(`artifacts/${app}/components/BrandLogo.tsx`), /color: colors\.brandGreen/);
    assert.match(read(`artifacts/${app}/components/AnimatedSplash.tsx`), /color: colors\.brandGreen.*>ici</);
  }
  for (const file of [
    "attached_assets/generated_images/icibiz-logo-concept.svg",
    "artifacts/nearbuy-site/public/icibiz-logo.svg",
    "artifacts/nearbuy-admin/public/icibiz-logo.svg",
  ]) {
    const svg = read(file);
    assert.ok(svg.includes('fill="#2F6246"'));
    assert.ok(svg.includes('fill="#B94F35"'));
    assert.ok(!svg.includes('fill="#26392F"'));
  }
});
