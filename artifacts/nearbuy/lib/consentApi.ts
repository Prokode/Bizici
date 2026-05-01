/**
 * Thin client wrapper around POST /api/me/consent. Called from the signup
 * screens *after* the Clerk session is active so the request is authenticated.
 *
 * The handler is fire-and-forget from the user's perspective: signup must
 * never appear to fail just because the audit-trail call did. We log instead.
 */
import { customFetch } from "@workspace/api-client-react";

export type ConsentSource = "email" | "google" | "apple" | "unknown";

export async function recordConsent(args: {
  version: string;
  source: ConsentSource;
}): Promise<void> {
  try {
    await customFetch<void>("/api/me/consent", {
      method: "POST",
      body: JSON.stringify(args),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[consent] failed to record consent", err);
    }
  }
}
