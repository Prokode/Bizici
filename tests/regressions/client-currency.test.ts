import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { convertPrice, formatCurrencyAmount } from "../../artifacts/nearbuy/lib/currency";
import { parseExchangeRates } from "../../artifacts/api-server/src/lib/exchange-rates";

const now = Date.parse("2026-10-20T03:00:00Z");
const table = { updatedAt: "2026-10-20T00:00:00Z", rates: { EUR: 1, XOF: 655.957, XAF: 655.957, USD: 1.1 } };
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("1500 FCFA is converted to euros, never merely relabeled as 1500 euros", () => {
  assert.ok(Math.abs(convertPrice(150000, "XOF", "EUR", table, now)! - 2.286735) < 0.00001);
  assert.equal(convertPrice(150000, "XOF", "XOF", undefined, now), 1500);
  assert.equal(convertPrice(0, "XOF", "EUR", table, now), 0);
  assert.equal(convertPrice(655957, "XOF", "USD", table, now), 11);
  assert.equal(convertPrice(1000, "EUR", "XAF", table, now), 6559.57);
});

test("unknown, expired, future-dated or invalid rates cannot create a fake conversion", () => {
  assert.equal(convertPrice(150000, "XOF", "EUR", undefined, now), null);
  assert.equal(convertPrice(150000, "ZZZ", "EUR", table, now), null);
  assert.equal(convertPrice(150000, "XOF", "GBP", table, now), null);
  assert.equal(convertPrice(150000, "XOF", "EUR", { ...table, updatedAt: "2026-10-01" }, now), null);
  assert.equal(convertPrice(150000, "XOF", "EUR", { ...table, updatedAt: "2026-10-25" }, now), null);
  assert.equal(convertPrice(NaN, "XOF", "EUR", table, now), null);
  assert.equal(convertPrice(150000, "XOF", "EUR", { ...table, rates: { ...table.rates, XOF: -1 } }, now), null);
});

test("reference rate parser validates provider status, base, date and positive currency rates", () => {
  const raw = { result: "success", base_code: "EUR", time_last_update_unix: Date.parse(table.updatedAt) / 1000, rates: { ...table.rates, BAD: -1, NAN: NaN } };
  assert.deepEqual(parseExchangeRates(raw, now), { ...table, base: "EUR", updatedAt: "2026-10-20T00:00:00.000Z" });
  for (const invalid of [
    null, {}, { ...raw, result: "error" }, { ...raw, base_code: "USD" },
    { ...raw, time_last_update_unix: 0 }, { ...raw, rates: { EUR: 1 } },
  ]) assert.throws(() => parseExchangeRates(invalid, now));
});

test("currency formatting respects locale and the actual seller currency", () => {
  assert.match(formatCurrencyAmount(1500, "XOF", "fr"), /F\s*CFA|XOF/);
  assert.doesNotMatch(formatCurrencyAmount(1500, "XOF", "fr"), /€/);
  assert.match(formatCurrencyAmount(2.286735, "EUR", "fr"), /2,29/);
  assert.match(formatCurrencyAmount(2.286735, "EUR", "en"), /2\.29/);
});

test("every customer price surface uses currency-aware display, not euro interpolation", () => {
  for (const file of [
    "app/shop/[shopId].tsx", "app/provider/[shopId].tsx", "app/(tabs)/search.tsx",
    "app/(tabs)/camera.tsx", "app/(tabs)/index.tsx", "app/course/run.tsx", "components/ShopBottomSheet.tsx",
  ]) {
    const source = read(`artifacts/nearbuy/${file}`);
    assert.match(source, /useCurrency/);
    assert.doesNotMatch(source, /€/);
    assert.match(source, /formatPrice\(/);
  }
  const context = read("artifacts/nearbuy/contexts/CurrencyContext.tsx");
  assert.match(context, /useState\("seller"\)/);
  assert.match(context, /await AsyncStorage\.setItem/);
  assert.match(context, /convertPrice/);
  assert.match(context, /unavailableShort/);
  const profile = read("artifacts/nearbuy/app/(tabs)/profile.tsx");
  assert.equal((profile.match(/<CurrencyPreference/g) ?? []).length, 2);
});

test("text, photo and shopping-run API responses preserve source currency", () => {
  const publicController = read("artifacts/api-server/src/controllers/public.ts");
  assert.equal((publicController.match(/select\("_id name marketName location isOpen currency"\)/g) ?? []).length, 2);
  assert.equal((publicController.match(/currency: s \? serializeShop\(s\)\.currency : null/g) ?? []).length, 2);
  assert.match(read("artifacts/api-server/src/controllers/me.ts"), /currency: serializeShop\(best\.shop\)\.currency/);
});
