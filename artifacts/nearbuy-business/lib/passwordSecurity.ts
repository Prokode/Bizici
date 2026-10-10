import type { useSession } from "@clerk/expo";

// Derive resources from the hook: Expo's type-only entrypoint may resolve a
// different @clerk/shared version than the React hooks in the installed SDK.
type SessionResource = NonNullable<ReturnType<typeof useSession>["session"]>;
export type SessionVerificationResource = Awaited<ReturnType<SessionResource["startVerification"]>>;
type SessionVerificationFirstFactor = NonNullable<SessionVerificationResource["supportedFirstFactors"]>[number];
type SessionVerificationSecondFactor = NonNullable<SessionVerificationResource["supportedSecondFactors"]>[number];

export function passwordValidation(password: string, confirmation: string): string | null {
  if (!password) return "missingPassword";
  if (password.length < 8) return "passwordTooShort";
  if (password !== confirmation) return "passwordMismatch";
  return null;
}

export function passwordError(error: unknown): string {
  const entries = (error as { errors?: { code?: string }[] } | null)?.errors;
  const code = entries?.[0]?.code;
  if (code === "form_password_pwned") return "passwordCompromised";
  if (code?.startsWith("form_password_")) return "passwordPolicy";
  return "failed";
}

type First = Exclude<SessionVerificationFirstFactor, { strategy: "passkey" | "enterprise_sso" }>;
export type VerificationChoice =
  | { id: string; stage: "first"; factor: First }
  | { id: string; stage: "second"; factor: SessionVerificationSecondFactor };

/** Only offer factors the server permits for this exact verification stage. */
export function verificationChoices(resource: SessionVerificationResource): VerificationChoice[] {
  if (resource.status === "needs_first_factor") {
    return (resource.supportedFirstFactors ?? [])
      .filter((factor): factor is First =>
        ["email_code", "phone_code", "password"].includes(factor.strategy))
      .map((factor, index) => ({ id: `first-${index}`, stage: "first", factor }));
  }
  if (resource.status === "needs_second_factor") {
    return (resource.supportedSecondFactors ?? [])
      .filter(factor => ["phone_code", "totp", "backup_code"].includes(factor.strategy))
      .map((factor, index) => ({ id: `second-${index}`, stage: "second", factor }));
  }
  return [];
}

export async function prepareVerification(session: SessionResource, choice: VerificationChoice) {
  const factor = choice.factor;
  if (choice.stage === "first" && factor.strategy === "email_code") {
    await session.prepareFirstFactorVerification({ strategy: factor.strategy, emailAddressId: factor.emailAddressId });
  } else if (factor.strategy === "phone_code") {
    const params = { strategy: factor.strategy, phoneNumberId: factor.phoneNumberId } as const;
    if (choice.stage === "first") await session.prepareFirstFactorVerification(params);
    else await session.prepareSecondFactorVerification(params);
  }
}

export function attemptVerification(session: SessionResource, choice: VerificationChoice, value: string) {
  if (choice.stage === "first") {
    return choice.factor.strategy === "password"
      ? session.attemptFirstFactorVerification({ strategy: "password", password: value })
      : session.attemptFirstFactorVerification({ strategy: choice.factor.strategy, code: value.trim() });
  }
  return session.attemptSecondFactorVerification({ strategy: choice.factor.strategy, code: value.trim() });
}
