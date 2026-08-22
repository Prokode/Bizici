import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isOriginAllowed,
  parseAllowedOrigins,
} from "../../artifacts/api-server/src/lib/cors";

describe("API CORS configuration", () => {
  it("keeps the existing permissive behavior when no allowlist is configured", () => {
    const allowedOrigins = parseAllowedOrigins(undefined);
    assert.equal(isOriginAllowed("https://example.com", allowedOrigins), true);
  });

  it("accepts configured staging origins and requests without an Origin header", () => {
    const allowedOrigins = parseAllowedOrigins(
      "https://admin-bizici.run.place, https://site-bizici.run.place",
    );
    assert.equal(
      isOriginAllowed("https://admin-bizici.run.place", allowedOrigins),
      true,
    );
    assert.equal(isOriginAllowed(undefined, allowedOrigins), true);
  });

  it("rejects browser origins outside the configured allowlist", () => {
    const allowedOrigins = parseAllowedOrigins(
      "https://admin-bizici.run.place",
    );
    assert.equal(
      isOriginAllowed("https://attacker.example", allowedOrigins),
      false,
    );
  });
});
