// Never log Clerk's complete debug object: it can contain session tokens,
// cookies, keys, and identifying claims. Only emit these fixed reason codes.
const SAFE_REASONS = new Set([
  "client-uat-but-no-session-token",
  "dev-browser-missing",
  "dev-browser-sync",
  "primary-responds-to-syncing",
  "primary-domain-cross-origin-sync",
  "satellite-needs-syncing",
  "session-token-and-uat-missing",
  "session-token-missing",
  "session-token-expired",
  "session-token-iat-before-client-uat",
  "session-token-nbf",
  "session-token-iat-in-the-future",
  "session-token-but-no-client-uat",
  "active-organization-mismatch",
  "token-type-mismatch",
  "unexpected-error",
  "token-expired",
  "token-invalid",
  "token-invalid-algorithm",
  "token-invalid-signature",
  "token-invalid-issuer",
  "token-invalid-authorized-parties",
  "token-not-active-yet",
  "token-iat-in-the-future",
  "token-verification-failed",
  "secret-key-invalid",
  "jwk-failed-to-resolve",
  "jwk-remote-failed-to-load",
  "jwk-remote-invalid",
  "jwk-remote-missing",
  "jwk-kid-mismatch",
  "jwk-local-missing",
]);

type AuthDiagnosticsInput = {
  authorization?: string;
  cookie?: string;
  sessionStatus?: string | null;
  debug?: () => unknown;
};

export function getAuthFailureDiagnostics(input: AuthDiagnosticsInput) {
  let clerkReason = "unavailable";
  try {
    const debug = input.debug?.();
    if (debug && typeof debug === "object" && "reason" in debug) {
      const reason = debug.reason;
      clerkReason =
        typeof reason === "string" && SAFE_REASONS.has(reason)
          ? reason
          : typeof reason === "string" &&
              reason.startsWith("session-token-expired-refresh-")
            ? "session-token-expired"
            : "unrecognized";
    }
  } catch {
    // Diagnostics must not change the authorization decision or response.
  }

  return {
    hasAuthorizationHeader: Boolean(input.authorization),
    hasBearerToken: /^Bearer\s+\S+$/i.test(input.authorization ?? ""),
    hasSessionCookie: /(?:^|;\s*)__session(?:_[^=;\s]+)?=[^;\s]+/.test(
      input.cookie ?? "",
    ),
    sessionPending: input.sessionStatus === "pending",
    clerkReason,
  };
}
