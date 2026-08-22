import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMongoReady,
  MONGOOSE_CONNECTED_STATE,
  requiresMongoReadiness,
} from "../../artifacts/api-server/src/lib/readiness";

describe("API readiness", () => {
  it("enables strict startup only when explicitly configured", () => {
    assert.equal(requiresMongoReadiness("true"), true);
    assert.equal(requiresMongoReadiness("false"), false);
    assert.equal(requiresMongoReadiness(undefined), false);
  });

  it("is ready only when Mongoose is connected", () => {
    assert.equal(isMongoReady(MONGOOSE_CONNECTED_STATE), true);
    assert.equal(isMongoReady(0), false);
    assert.equal(isMongoReady(2), false);
    assert.equal(isMongoReady(3), false);
  });
});
