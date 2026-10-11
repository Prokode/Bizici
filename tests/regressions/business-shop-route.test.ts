import assert from "node:assert/strict";
import { test } from "node:test";
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
