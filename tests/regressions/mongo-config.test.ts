import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mongoUri } from "../../lib/db/src/config";

describe("MongoDB configuration", () => {
  it("uses the workspace staging secret for development over a stale local URI", () => {
    assert.equal(mongoUri({
      NODE_ENV: "development",
      STAGING_MONGODB_URI: "staging",
      MONGODB_URI: "stale",
    }), "staging");
  });

  it("does not use staging credentials outside explicit development", () => {
    for (const NODE_ENV of ["production", "test", undefined]) {
      assert.equal(mongoUri({ NODE_ENV, STAGING_MONGODB_URI: "staging", MONGODB_URI: "configured" }), "configured");
      assert.equal(mongoUri({ NODE_ENV, STAGING_MONGODB_URI: "staging" }), undefined);
    }
  });

  it("preserves ordinary development configuration without the staging secret", () => {
    assert.equal(mongoUri({ NODE_ENV: "development", MONGODB_URI: "configured" }), "configured");
    assert.equal(mongoUri({ NODE_ENV: "development" }), undefined);
  });
});