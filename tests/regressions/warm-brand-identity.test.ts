import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import client from "../../artifacts/nearbuy/constants/colors";
import seller from "../../artifacts/nearbuy-business/constants/colors";

const source = (app: string, path: string) =>
  readFileSync(new URL(`../../artifacts/${app}/${path}`, import.meta.url), "utf8");

function luminance(hex: string) {
  const rgb = hex.replace("#", "").match(/.{2}/g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("client and seller share the approved cream/terracotta identity", () => {
  assert.deepEqual(client, seller);
  assert.equal(client.light.background, "#FFF8E9");
  assert.equal(client.light.card, "#FFFDF7");
  assert.equal(client.light.primary, "#B94F35");
  assert.equal(client.dark.background, "#211C18");
  assert.equal(client.radius, 18);
});

test("warm light and dark palettes keep text and action labels readable", () => {
  for (const palette of [client.light, client.dark]) {
    for (const [ink, surface] of [
      [palette.foreground, palette.background],
      [palette.brandGreen, palette.background],
      [palette.brandGreen, palette.card],
      [palette.cardForeground, palette.card],
      [palette.mutedForeground, palette.background],
      [palette.mutedForeground, palette.card],
      [palette.primaryForeground, palette.primary],
      [palette.secondaryForeground, palette.secondary],
      [palette.accentForeground, palette.accent],
      [palette.destructiveForeground, palette.destructive],
      [palette.successForeground, palette.success],
      [palette.warningForeground, palette.warning],
    ]) {
      assert.ok(contrast(ink, surface) >= 4.5, `${ink} on ${surface} must meet AA text contrast`);
    }
  }
});

test("new users start light without discarding existing stored theme choices", () => {
  for (const app of ["nearbuy", "nearbuy-business"]) {
    const theme = source(app, "lib/theme.ts");
    assert.match(theme, /let current: ThemePreference = "light"/);
    assert.match(theme, /THEME_PREFS = \["light", "dark", "system"\]/);
    assert.match(theme, /if \(userSelected\) return/);
    assert.match(theme, /apply\(stored as ThemePreference\)/);
    const hook = source(app, "hooks/useColors.ts");
    assert.match(hook, /export function useThemeScheme/);
    assert.match(hook, /pref === "system" \? systemScheme : pref/);
  }
});

test("both native splash backgrounds and root chrome use the new identity", () => {
  for (const app of ["nearbuy", "nearbuy-business"]) {
    assert.equal(JSON.parse(source(app, "app.json")).expo.splash.backgroundColor, client.light.background);
    const layout = source(app, "app/_layout.tsx");
    assert.match(layout, /SystemUI\.setBackgroundColorAsync\(colors\.background\)/);
    assert.match(layout, /<StatusBar style=\{scheme === "dark" \? "light" : "dark"\}/);
    assert.match(layout, /backgroundColor: colors\.background/);
  }
});

test("search filter chips do not stretch into the available results space", () => {
  const search = source("nearbuy", "app/(tabs)/search.tsx");
  assert.match(search, /chipsScroll: \{ flexGrow: 0,/);
  assert.match(search, /chipsRow: \{[^}]*alignItems: "center"/);
});
