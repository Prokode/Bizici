import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAuthFailureDiagnostics } from "../../artifacts/api-server/src/lib/authDiagnostics";

describe("safe API authentication failure diagnostics", () => {
  it("identifies missing credentials and the Clerk reason", () => {
    assert.deepEqual(
      getAuthFailureDiagnostics({
        debug: () => ({ reason: "session-token-and-uat-missing" }),
      }),
      {
        hasAuthorizationHeader: false,
        hasBearerToken: false,
        hasSessionCookie: false,
        sessionPending: false,
        clerkReason: "session-token-and-uat-missing",
      },
    );
  });

  it("reports credential presence without emitting credentials or debug data", () => {
    const output = getAuthFailureDiagnostics({
      authorization: "Bearer private-token-value",
      cookie: "__session=private-cookie-value; other=value",
      debug: () => ({
        reason: "token-invalid-signature",
        message: "private-message-value",
        secretKey: "private-key-value",
        sessionToken: "private-token-value",
        userId: "private-user-value",
      }),
    });
    assert.equal(output.hasBearerToken, true);
    assert.equal(output.hasSessionCookie, true);
    assert.equal(output.clerkReason, "token-invalid-signature");
    assert.doesNotMatch(JSON.stringify(output), /private-/);
  });

  it("does not copy arbitrary reason strings or malformed authorization values", () => {
    const output = getAuthFailureDiagnostics({
      authorization: "Basic private-value",
      cookie: "unrelated__session=private-value",
      debug: () => ({ reason: "private-value" }),
    });
    assert.equal(output.hasAuthorizationHeader, true);
    assert.equal(output.hasBearerToken, false);
    assert.equal(output.hasSessionCookie, false);
    assert.equal(output.clerkReason, "unrecognized");
    assert.doesNotMatch(JSON.stringify(output), /private-/);
  });

  it("normalizes refresh failures and identifies pending sessions", () => {
    const output = getAuthFailureDiagnostics({
      sessionStatus: "pending",
      cookie: "other=value; __session_instance=nonempty",
      debug: () => ({ reason: "session-token-expired-refresh-private-value" }),
    });
    assert.equal(output.sessionPending, true);
    assert.equal(output.hasSessionCookie, true);
    assert.equal(output.clerkReason, "session-token-expired");
  });

  it("does not throw if SDK diagnostics fail or are unavailable", () => {
    assert.equal(getAuthFailureDiagnostics({}).clerkReason, "unavailable");
    assert.equal(
      getAuthFailureDiagnostics({
        debug: () => { throw new Error("private-error-value"); },
      }).clerkReason,
      "unavailable",
    );
  });
});
