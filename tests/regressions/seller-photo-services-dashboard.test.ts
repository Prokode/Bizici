import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
function load(path: string, require: (name: string) => unknown, globals: object = {}) {
  const module = { exports: {} as any };
  const js = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require, ...globals });
  return module.exports;
}

for (const app of ["nearbuy", "nearbuy-business"]) {
  for (const platform of ["android", "ios", "web"]) {
    test(`${app} photo modal mounts on ${platform} without requiring native DOM events`, () => {
      const cleanups: (() => void)[] = [];
      const listeners = new Map<string, (e: any) => void>();
      const win = platform === "web" ? {
        addEventListener: (key: string, callback: (e: any) => void) => listeners.set(key, callback),
        removeEventListener: (key: string) => listeners.delete(key),
      } : {}; // RN defines window but has no addEventListener.
      let closed = false;
      const react = {
        createElement: () => null,
        useState: (init: any) => [typeof init === "function" ? init() : init, () => {}],
        useEffect: (effect: () => any) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
      };
      const { PhotoViewer } = load(`artifacts/${app}/components/PhotoViewer.tsx`, name => {
        if (name === "react") return react;
        if (name === "react-native") return { Platform: { OS: platform }, StyleSheet: { create: (x: any) => x } };
        if (name.includes("safe-area")) return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
        if (name === "react-i18next") return { useTranslation: () => ({ t: (key: string) => key }) };
        if (name.includes("useColors")) return { useColors: () => ({}) };
        return {};
      }, { window: win });
      assert.doesNotThrow(() => PhotoViewer({
        photos: ["one.jpg", "two.jpg"], initialIndex: 1, label: "Product",
        onClose: () => { closed = true; },
      }));
      if (platform === "web") {
        assert.ok(listeners.has("keydown"));
        listeners.get("keydown")!({ key: "Escape", preventDefault() {} });
        assert.equal(closed, true);
      } else assert.equal(listeners.size, 0);
      cleanups.forEach(cleanup => cleanup());
      assert.equal(listeners.size, 0);
    });
  }
}

for (const route of ["dashboard", "summary"]) {
  test(`${route} counts nearby requests with a count-compatible 5 km spherical query`, async () => {
    const queries: any[] = [];
    const db = {
      Product: { countDocuments: async () => 3 },
      Shop: { findById: () => ({ lean: async () => ({ location: { type: "Point", coordinates: [1.2, 6.1] } }) }) },
      Conversation: { aggregate: async () => [], find: () => ({ lean: async () => [] }) },
      ShopReview: { aggregate: async () => [] },
      BroadcastRequest: { countDocuments: async (query: any) => {
        assert.equal(query.location.$nearSphere, undefined, "$nearSphere cannot be used in counts");
        queries.push(query);
        return 4;
      } },
    };
    const { shopsController } = load("artifacts/api-server/src/controllers/shops.ts", name => {
      if (name === "@workspace/db") return db;
      if (name === "mongoose") return { Types: { ObjectId: class {} } };
      return {};
    });
    let result: any;
    await shopsController[route]({ params: { shopId: "507f1f77bcf86cd799439011" } }, {
      json: (data: any) => { result = data; },
    });
    assert.equal(result.activeRequestsCount, 4);
    assert.equal(queries[0].status, "active");
    assert.deepEqual(Array.from(queries[0].location.$geoWithin.$centerSphere[0]), [1.2, 6.1]);
    assert.equal(queries[0].location.$geoWithin.$centerSphere[1], 5 / 6378.1);
  });
}

test("API rejects product-only service creation instead of silently converting the shop", async () => {
  let writes = 0;
  const { servicesController } = load("artifacts/api-server/src/controllers/services.ts", name => {
    if (name === "@workspace/db") return {
      Shop: {
        findById: () => ({ select: () => ({ lean: async () => ({ kind: "products" }) }) }),
        updateOne: () => { writes++; },
      },
      Service: { create: () => { writes++; } },
    };
    return {};
  });
  let status = 200;
  let response: any;
  const res = { status: (code: number) => { status = code; return res; }, json: (body: any) => { response = body; } };
  await servicesController.create({ params: { shopId: "507f1f77bcf86cd799439011" }, body: { title: "Repair", pricingType: "fixed" } }, res);
  assert.equal(status, 403);
  assert.match(response.error, /shop type/);
  assert.equal(writes, 0);
});

test("all service entry points fail closed behind the same shop-type gate", () => {
  const base = "artifacts/nearbuy-business/app/(home)/shops/[shopId]";
  for (const screen of ["(tabs)/services", "add-service", "edit-service", "provider-profile"]) {
    const source = read(`${base}/${screen}.tsx`);
    assert.match(source, /<ServiceAccessGate>/);
    assert.match(source, /useShopId\(\)/);
  }
  const gate = read("artifacts/nearbuy-business/components/ServiceAccessGate.tsx");
  assert.match(gate, /if \(shopId && isPending\)/);
  assert.match(gate, /if \(!shopId \|\| isError \|\| !shop\)/);
  assert.match(gate, /shop\.kind === "products"/);
  assert.match(gate, /title=\{t\("services.addCta"\)\} disabled/);
  const dashboard = read(`${base}/(tabs)/dashboard.tsx`);
  assert.match(dashboard, /useShopId\(\)/);
  assert.match(dashboard, /if \(shopId\) void refetch\(\)/);
});
