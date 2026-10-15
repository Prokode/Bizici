import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicShopKycFilter, isPublicShopKycAllowed } from "../../artifacts/api-server/src/lib/kyc-policy";

test("launch policy allows every KYC state without changing it", () => {
  assert.deepEqual(publicShopKycFilter(), {});
  for (const status of [undefined, null, "unsubmitted", "pending", "rejected", "approved"]) {
    assert.equal(isPublicShopKycAllowed(status), true);
  }
});

test("KYC approval requirements can be restored", () => {
  assert.deepEqual(publicShopKycFilter(true), { "kyc.status": "approved" });
  for (const status of [undefined, null, "unsubmitted", "pending", "rejected"]) {
    assert.equal(isPublicShopKycAllowed(status, true), false);
  }
  assert.equal(isPublicShopKycAllowed("approved", true), true);
});

test("all public KYC gates use the policy and seller warnings are disabled", () => {
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const shops = read("artifacts/api-server/src/controllers/public.ts");
  const services = read("artifacts/api-server/src/controllers/services-public.ts");
  assert.equal((shops.match(/\.\.\.publicShopKycFilter\(\)/g) ?? []).length, 4);
  assert.match(shops, /isPublicShopKycAllowed\(shop.kyc\?\.status\)/);
  assert.equal((services.match(/\.\.\.publicShopKycFilter\(\)/g) ?? []).length, 2);
  assert.doesNotMatch(shops + services, /"kyc.status": "approved"/);
  const banner = read("artifacts/nearbuy-business/components/KycBanner.tsx");
  assert.match(banner, /KYC_ENFORCEMENT_ENABLED: boolean = false/);
  assert.match(banner, /enabled: KYC_ENFORCEMENT_ENABLED/);
  const routes = read("artifacts/api-server/src/routes/kyc.ts");
  assert.match(routes, /requireAdmin/);
  assert.match(routes, /requireShopAccess/);
  assert.match(routes, /requireAuth/);
});
