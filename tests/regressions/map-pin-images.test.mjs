import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../artifacts/nearbuy");
const source = readFileSync(`${root}/lib/map-pin-images.ts`, "utf8");
const table = source.slice(source.indexOf("= {") + 2, source.indexOf("\n};") + 2);
const pins = new Function("require", `return (${table});`)((path) => resolve(root, "lib", path));
const body = source.slice(source.indexOf('  const initial ='), source.lastIndexOf("}"));
const getPin = new Function("pins", "name", "isService", body).bind(null, pins);

test("initials support accents, case, digits and a safe fallback", () => {
  assert.equal(getPin(" Marie Fashion ", false), pins.M.shop);
  assert.equal(getPin("électricité", true), pins.E.service);
  assert.equal(getPin("2 services", true), pins["2"].service);
  assert.equal(getPin("", false), pins["?"].shop);
  assert.equal(getPin("中文", true), pins["?"].service);
});

test("all bundled pins have matching 1x, 2x and 3x dimensions", () => {
  for (const pin of Object.values(pins)) {
    for (const path of Object.values(pin)) {
      for (const scale of [1, 2, 3]) {
        const file = scale === 1 ? path : path.replace(".png", `@${scale}x.png`);
        assert.ok(existsSync(file), file);
        const png = readFileSync(file);
        assert.equal(png.readUInt32BE(16), 56 * scale);
        assert.equal(png.readUInt32BE(20), 68 * scale);
      }
    }
  }
});

test("map uses native image markers instead of clipped custom views", () => {
  const screen = readFileSync(`${root}/app/(tabs)/index.tsx`, "utf8");
  assert.match(screen, /image=\{getMapPinImage\(s.name, isService\)\}/);
  assert.doesNotMatch(screen, /<ShopMarker|<ProviderMarker|trackMarkerChanges/);
});
