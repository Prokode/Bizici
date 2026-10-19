import * as AuthSession from "expo-auth-session";

/** Return to the initiating screen so failures remain visible after OAuth. */
export function clientSSORedirectUri(screen: "sign-in" | "sign-up") {
  return AuthSession.makeRedirectUri({
    native: `bizici://${screen}`,
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

export function ssoIncompleteReason(result: SSOResult): string | null {
  if (result.createdSessionId && typeof result.setActive === "function") return null;
  const browser = result.authSessionResult?.type;
  if (browser === "cancel" || browser === "dismiss") return "cancelled";
  if (result.signIn?.status === "needs_second_factor") return "second_factor";
  if (result.signUp?.status === "missing_requirements") return "requirements";
  return "incomplete";
}
