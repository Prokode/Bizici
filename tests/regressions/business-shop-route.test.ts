import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { normalizeShopId, resolveShopId } from "../../artifacts/nearbuy-business/lib/shopRoute";

const first = "507f1f77bcf86cd799439011";
const second = "507f1f77bcf86cd799439012";

test("new tabs retain the parent shop even when local params are empty", () => {
  assert.equal(resolveShopId(undefined, first), first);
  assert.equal(resolveShopId({}, first), first);
});
test("shop scope takes priority over stale child params", () => {
  assert.equal(resolveShopId(first, second), second);
  assert.equal(resolveShopId(undefined, second), second);
});
test("valid deep-link parameters work without an inherited shop", () => {
  assert.equal(resolveShopId(first, undefined), first);
  assert.equal(normalizeShopId([first]), first);
});
test("missing and malformed IDs cannot enable shop queries or retry", () => {
  for (const value of [undefined, null, "", "undefined", "null", {}, [], [first, second], "/shops/undefined"]) {
    assert.equal(normalizeShopId(value), undefined);
    assert.equal(resolveShopId(value, undefined), undefined);
  }
});

test("messages and its unread badge inherit the same shop scope", () => {
  const base = "../../artifacts/nearbuy-business/app/(home)/shops/[shopId]/(tabs)/";
  const messages = readFileSync(new URL(`${base}messages.tsx`, import.meta.url), "utf8");
  const tabs = readFileSync(new URL(`${base}_layout.tsx`, import.meta.url), "utf8");
  for (const source of [messages, tabs]) {
    assert.match(source, /const shopId = useShopId\(\)/);
    assert.match(source, /c\.myRole === "seller" && c\.shop\.id === shopId/);
    assert.match(source, /queryKey: \["chat-conv-list"\]/);
  }
  assert.doesNotMatch(messages, /useLocalSearchParams/);
  assert.match(messages, /enabled: !!shopId/);
  assert.match(messages, /if \(shopId\) void query\.refetch\(\)/);
  assert.match(messages, /query\.isError \|\| !shopId/);
});
