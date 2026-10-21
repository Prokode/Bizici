import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { openShopConversation } from "../../artifacts/nearbuy/lib/chatStart";
import { setBaseUrl, setAuthTokenGetter } from "../../lib/api-client-react/src/custom-fetch";

const originalFetch = globalThis.fetch;
const id = "0123456789abcdef01234567";
const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
afterEach(() => {
  globalThis.fetch = originalFetch;
  setBaseUrl(null);
  setAuthTokenGetter(null);
});

test("chat opening rejects stalled token acquisition instead of loading forever", async () => {
  globalThis.fetch = async () => { throw new Error("Token must complete first"); };
  await assert.rejects(openShopConversation(id, () => new Promise(() => {}), { timeoutMs: 30 }), /timed out/);
});

test("chat opening cancels a stalled request with its token and bounded deadline", async () => {
  setBaseUrl("https://chat.example.test");
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_input, init) => {
    signal = init?.signal;
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-token");
    return new Promise(() => {});
  };
  await assert.rejects(openShopConversation(id, async () => "fixture-token", { timeoutMs: 40 }));
  assert.equal(signal?.aborted, true);
});

test("chat deadline also covers delayed response bodies", async () => {
  setBaseUrl("https://chat.example.test");
  globalThis.fetch = async () => ({
    ok: true, status: 200, statusText: "OK", body: {},
    headers: new Headers({ "content-type": "application/json" }),
    text: () => new Promise(() => {}),
  }) as unknown as Response;
  await assert.rejects(openShopConversation(id, async () => "fixture-token", { timeoutMs: 40 }));
});

test("chat retry succeeds after a failed session, without registering a global token getter", async () => {
  setBaseUrl("https://chat.example.test");
  await assert.rejects(openShopConversation(id, async () => null), { status: 401 });
  globalThis.fetch = async () => new Response(JSON.stringify({ conversation: { id } }), {
    headers: { "content-type": "application/json" },
  });
  assert.equal((await openShopConversation(id, async () => "fixture-token")).id, id);
});

test("chat never navigates to missing or malformed conversation ids", async () => {
  setBaseUrl("https://chat.example.test");
  globalThis.fetch = async () => new Response(JSON.stringify({ conversation: {} }), {
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(openShopConversation(id, async () => "fixture-token"), /Invalid conversation/);
});

test("leaving chat cancels stalled token acquisition", async () => {
  const controller = new AbortController();
  const opening = openShopConversation(id, () => new Promise(() => {}), { signal: controller.signal });
  controller.abort();
  await assert.rejects(opening);
});

test("chat effects do not restart for changing router/token function references", () => {
  const source = read("artifacts/nearbuy/app/chat-shop/[shopId].tsx");
  assert.match(source, /current\.current\.getToken/);
  assert.match(source, /controller\.abort\(\)/);
  assert.doesNotMatch(source, /\}, \[[^\]]*\bgetToken\b[^\]]*\]/);
  assert.doesNotMatch(source, /\}, \[[^\]]*\brouter\b[^\]]*\]/);
  assert.match(source, /if \(isLoaded\) return/);
});

test("seller settings avoids eager native map and binary-upload initialization", () => {
  const screen = read("artifacts/nearbuy-business/app/(home)/shops/[shopId]/(tabs)/profile.tsx");
  assert.doesNotMatch(screen, /ShopMapPreview|react-native-maps/);
  assert.match(screen, /Number\.isFinite\(shop\.latitude\)/);
  assert.match(screen, /Array\.isArray\(shops\)/);
  assert.match(screen, /export function ErrorBoundary/);
  const upload = read("artifacts/nearbuy-business/lib/shopBrandPhoto.ts");
  assert.doesNotMatch(upload, /^import .*from "expo\/fetch"/m);
  assert.match(upload, /await import\("expo\/fetch"\)/);
});

test("guest sign-in labels exist in every language and both apps retain identical safe brand-photo components", () => {
  for (const app of ["nearbuy", "nearbuy-business"]) {
    for (const lang of ["en", "fr"]) {
      const locale = JSON.parse(read(`artifacts/${app}/lib/i18n/locales/${lang}.json`));
      assert.ok(locale.common.signIn);
    }
  }
  assert.equal(read("artifacts/nearbuy/components/BrandPhoto.tsx"), read("artifacts/nearbuy-business/components/BrandPhoto.tsx"));
});
