import * as AuthSession from "expo-auth-session";

/** Keep Expo Go's exp:// callback, but use our registered scheme in APKs. */
export function sellerSSORedirectUri(screen: "sign-in" | "sign-up") {
  return AuthSession.makeRedirectUri({
    // Return to the initiating screen, not the app root, which redirects
    // before Clerk has finished exchanging the browser result.
    native: `bizici-pro://${screen}`,
    path: screen,
  });
}

type SSOResult = {
  createdSessionId?: string | null;
  setActive?: unknown;
  authSessionResult?: { type: string } | null;
  signIn?: { status: string | null } | null;
  signUp?: { status: string | null; missingFields?: string[] } | null;
};

/** Only safe status codes, never callback URLs, nonces, or session tokens. */
export function ssoIncompleteReason(result: SSOResult): string | null {
  if (result.createdSessionId && typeof result.setActive === "function") return null;
  const browser = result.authSessionResult?.type;
  if (browser === "cancel" || browser === "dismiss") return "cancelled";
  if (result.signIn?.status === "needs_second_factor") return "second_factor";
  if (result.signUp?.status === "missing_requirements") return "requirements";
  return "incomplete";
}
