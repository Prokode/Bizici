import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const output: any = {};
let unavailable = false;
const js = ts.transpileModule(readFileSync(new URL("../../artifacts/api-server/src/lib/price-range.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "exports", js)((name: string) => {
  assert.equal(name, "./exchange-rates");
  return { getExchangeRates: async () => {
    if (unavailable) throw new Error("Unavailable");
    return { rates: { EUR: 1, XOF: 655.957, USD: 1.1 } };
  } };
}, output);
const { parsePriceRange, sellerPriceBounds, productPriceClauses, servicePriceMatches } = output;
const shops = [{ _id: "fcfa", currency: { code: "XOF" } }, { _id: "euro", currency: { code: "EUR" } }, { _id: "unknown" }];

test("price range validates bounds, zero, open ends and explicit currency", () => {
  assert.equal(parsePriceRange({}), null);
  assert.deepEqual(parsePriceRange({ minPrice: "0", priceCurrency: "XOF" }), { min: 0, max: undefined, currency: "XOF" });
  assert.deepEqual(parsePriceRange({ maxPrice: "1500.50", priceCurrency: "XOF" }), { min: undefined, max: 1500.5, currency: "XOF" });
  for (const query of [
    { minPrice: "-1" }, { minPrice: "NaN" }, { maxPrice: "Infinity" }, { minPrice: "" },
    { minPrice: "1e3" }, { minPrice: "2.001" }, { minPrice: ["2"] }, { minPrice: "1000000000001" },
    { minPrice: "3", maxPrice: "2" }, { minPrice: "1", priceCurrency: "xof" },
  ]) assert.throws(() => parsePriceRange({ priceCurrency: "XOF", ...query }));
  assert.throws(() => parsePriceRange({ minPrice: "1" }));
});

test("product bounds keep legacy FCFA hundredths and include exact limits", async () => {
  const bounds = await sellerPriceBounds(shops.slice(0, 1), { min: 1500, max: 3500, currency: "XOF" });
  assert.deepEqual(productPriceClauses(shops, bounds), [{ shop: "fcfa", price: { $gte: 150000, $lte: 350000 } }]);
  assert.deepEqual(productPriceClauses(shops, new Map()), []);
});

test("price bounds convert per seller and omit unknown shop currencies", async () => {
  const bounds = await sellerPriceBounds(shops, { min: 655.957, max: 1311.914, currency: "XOF" });
  assert.equal(bounds.get("euro").min, 1);
  assert.equal(bounds.get("euro").max, 2);
  assert.equal(bounds.has("unknown"), false);
});

test("services use advertised major-unit prices and exclude quotes or missing prices", async () => {
  const bounds = await sellerPriceBounds(shops.slice(0, 1), { min: 1500, max: 3500, currency: "XOF" });
  assert.equal(servicePriceMatches("fcfa", { price: 1500, pricingType: "fixed" }, bounds), true);
  assert.equal(servicePriceMatches("fcfa", { price: 3500, pricingType: "hourly" }, bounds), true);
  assert.equal(servicePriceMatches("fcfa", { price: 1499, pricingType: "fixed" }, bounds), false);
  assert.equal(servicePriceMatches("fcfa", { price: 3501, pricingType: "fixed" }, bounds), false);
  assert.equal(servicePriceMatches("fcfa", { price: 2000, pricingType: "quote" }, bounds), false);
  assert.equal(servicePriceMatches("fcfa", { price: null, pricingType: "fixed" }, bounds), false);
  assert.equal(servicePriceMatches("unknown", { price: 2000, pricingType: "fixed" }, bounds), false);
});

test("same-currency filtering works offline, conversion failures remain explicit", async () => {
  unavailable = true;
  try {
    assert.equal((await sellerPriceBounds(shops.slice(0, 1), { max: 1500, currency: "XOF" })).size, 1);
    await assert.rejects(sellerPriceBounds(shops, { max: 1500, currency: "XOF" }), /Unavailable/);
  } finally { unavailable = false; }
});
