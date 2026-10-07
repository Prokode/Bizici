/** Remove invisible paste formatting, not visible characters or internal spaces. */
export function normalizeSignInEmail(email: string) {
  return email.replace(/[\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, "").trim();
}

/** Normalize the identifier only. Spaces can be meaningful in passwords. */
export function passwordSignInParams(email: string, password: string) {
  return { identifier: normalizeSignInEmail(email), password };
}

export function isSignInEmailValid(email: string) {
  return /^[^\s@\p{C}]+@[^\s@\p{C}]+\.[^\s@\p{C}]+$/u.test(normalizeSignInEmail(email));
}

function errorDetails(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") return {};
  const outer = error as Record<string, unknown>;
  const first = Array.isArray(outer.errors) ? outer.errors[0] : null;
  return first && typeof first === "object" ? first : outer;
}

/** Only a provider code is exposed, never the error payload or credentials. */
export function signInErrorReference(error: unknown): string {
  const { code } = errorDetails(error);
  return typeof code === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(code)
    ? code
    : "unknown_error";
}

export function signInErrorMessage(
  error: unknown,
  credentialMessage: string,
  fallback: string,
) {
  const details = errorDetails(error);
  if (
    ["form_identifier_not_found", "form_identifier_invalid", "form_password_incorrect"].includes(
      signInErrorReference(error),
    )
  ) {
    return credentialMessage;
  }
  for (const value of [details.longMessage, details.long_message, details.message]) {
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}
