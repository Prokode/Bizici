import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const apps = ["nearbuy", "nearbuy-business"];
const pathData = (source: string, tag: string) =>
  [...source.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?\\bd="([^"]+)"`, "g"))].map(match => match[1]);

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

test("mobile splash animates the approved three-part vector mark and respects motion preferences", () => {
  const approvedPaths = pathData(read("artifacts/nearbuy/assets/images/icibiz-mark.svg"), "path");
  for (const app of apps) {
    const splash = read(`artifacts/${app}/components/AnimatedSplash.tsx`);
    assert.doesNotMatch(splash, /icibiz-mark\.png/);
    assert.deepEqual(pathData(splash, "Path"), approvedPaths);
    assert.equal((splash.match(/<Circle\b/g) ?? []).length, 1);
    assert.match(splash, /const VIEW_BOX = "2 28 25 30\.3"/);
    assert.match(splash, /<Circle cx="14\.53" cy="41\.76" r="1\.076"/);
    assert.match(splash, /dotOpacity/);
    assert.match(splash, /bodyOpacity/);
    assert.match(splash, /wingsOpacity/);
    assert.match(splash, /leftWingX\.value = -12/);
    assert.match(splash, /rightWingX\.value = 12/);
    assert.match(splash, /dotY\.value = -11/);
    assert.match(splash, /bodyY\.value = 12/);
    assert.match(splash, /reduceMotionChanged/);
    assert.match(splash, /completedRef\.current/);
    assert.match(splash, /startedRef\.current = false/);
    assert.match(splash, /setMotionMode\("reduced"\)/);
    assert.match(splash, /finishOnce\(\)/);
    assert.equal(Number(splash.match(/const FINISH_MS = (\d+)/)?.[1]), 2500);
    assert.ok(!splash.includes("BizIci"));
    if (app === "nearbuy-business") assert.match(splash, />Pro<\/Text>/);
  }
});

test("web splash animates the approved vector geometry, directions, shake and reduced-motion path", () => {
  const approvedPaths = pathData(read("artifacts/nearbuy-site/public/icibiz-mark.svg"), "path");
  for (const app of ["nearbuy-site", "nearbuy-admin"]) {
    const splash = read(`artifacts/${app}/src/components/AnimatedSplash.tsx`);
    const css = read(`artifacts/${app}/src/components/AnimatedSplash.css`);
    assert.deepEqual(pathData(splash, "path"), approvedPaths);
    assert.equal((splash.match(/<circle\b/g) ?? []).length, 1);
    assert.match(splash, /viewBox="2 28 25 30\.3"/);
    assert.match(splash, /className="bsplash__dot"/);
    assert.match(splash, /className="bsplash__body"/);
    assert.match(splash, /className="bsplash__wings"/);
    assert.match(splash, /bsplash__wing--left/);
    assert.match(splash, /bsplash__wing--right/);
    assert.doesNotMatch(splash, /<img className="bsplash__mark"/);
    assert.match(splash, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
    assert.match(splash, /completedRef\.current/);
    assert.match(splash, /finishOnce\(\)/);
    assert.match(css, /translateY\(-2\.2px\)/);
    assert.match(css, /translateY\(2\.4px\)/);
    assert.match(css, /translateX\(-2\.4px\)/);
    assert.match(css, /translateX\(2\.4px\)/);
    assert.match(css, /bsplash-pin-shake 583ms ease-in-out 1323ms/);
    assert.equal(Number(splash.match(/const FULL_FINISH_MS = (\d+)/)?.[1]), 2500);
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
