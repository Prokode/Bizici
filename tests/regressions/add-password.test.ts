import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  attemptVerification,
  passwordError,
  passwordValidation,
  prepareVerification,
  verificationChoices,
  type SessionVerificationResource,
  type VerificationChoice,
} from "../../artifacts/nearbuy-business/lib/passwordSecurity";

const resource = (overrides: object) => ({
  status: "needs_first_factor", supportedFirstFactors: [], supportedSecondFactors: [], ...overrides,
}) as SessionVerificationResource;
const emailFactor = { strategy: "email_code", emailAddressId: "email_test", safeIdentifier: "t***@example.com" } as const;
const phoneFactor = { strategy: "phone_code", phoneNumberId: "phone_test", safeIdentifier: "***1234" } as const;
const firstEmail: VerificationChoice = { id: "first-0", stage: "first", factor: emailFactor };
const readProject = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("password validation rejects empty, short and mismatched entries", () => {
  assert.equal(passwordValidation("", ""), "missingPassword");
  assert.equal(passwordValidation("short", "short"), "passwordTooShort");
  assert.equal(passwordValidation("longer-password", "different-password"), "passwordMismatch");
});

test("password validation never normalizes password whitespace", () => {
  assert.equal(passwordValidation(" password ", "password"), "passwordMismatch");
  assert.equal(passwordValidation(" password ", " password "), null);
});

test("Clerk error mapping never exposes provider payloads or submitted credentials", () => {
  assert.equal(passwordError({ errors: [{ code: "form_password_pwned", message: "sensitive" }] }), "passwordCompromised");
  assert.equal(passwordError({ errors: [{ code: "form_password_length_too_short" }] }), "passwordPolicy");
  assert.equal(passwordError({ errors: [{ code: "network_error", message: "sensitive" }] }), "failed");
  assert.equal(passwordError(null), "failed");
});

test("first-factor choices exclude unsupported methods and second factors", () => {
  const choices = verificationChoices(resource({
    supportedFirstFactors: [emailFactor, phoneFactor, { strategy: "password" }, { strategy: "passkey" }],
    supportedSecondFactors: [{ strategy: "totp" }],
  }));
  assert.deepEqual(choices.map(c => c.factor.strategy), ["email_code", "phone_code", "password"]);
  assert.ok(choices.every(c => c.stage === "first"));
});

test("MFA only uses server-provided second factors; completion has no challenges", () => {
  const choices = verificationChoices(resource({
    status: "needs_second_factor",
    supportedFirstFactors: [emailFactor],
    supportedSecondFactors: [{ strategy: "totp" }, { strategy: "backup_code" }, phoneFactor],
  }));
  assert.deepEqual(choices.map(c => c.factor.strategy), ["totp", "backup_code", "phone_code"]);
  assert.ok(choices.every(c => c.stage === "second"));
  assert.deepEqual(verificationChoices(resource({ status: "complete" })), []);
  assert.deepEqual(verificationChoices(resource({ supportedFirstFactors: null })), []);
});

function mockSession() {
  const calls: { method: string; params: unknown }[] = [];
  const methods = [
    "prepareFirstFactorVerification", "prepareSecondFactorVerification",
    "attemptFirstFactorVerification", "attemptSecondFactorVerification",
  ];
  const session = Object.fromEntries(methods.map(method => [
    method, async (params: unknown) => {
      calls.push({ method, params });
      return resource({ status: "complete" });
    },
  ])) as unknown as Parameters<typeof prepareVerification>[0];
  return { session, calls };
}

test("email/phone preparation sends only the selected identification ID", async () => {
  const { session, calls } = mockSession();
  await prepareVerification(session, firstEmail);
  await prepareVerification(session, { id: "second-0", stage: "second", factor: phoneFactor });
  await prepareVerification(session, { id: "second-1", stage: "second", factor: { strategy: "totp" } });
  assert.deepEqual(calls, [
    { method: "prepareFirstFactorVerification", params: { strategy: "email_code", emailAddressId: "email_test" } },
    { method: "prepareSecondFactorVerification", params: { strategy: "phone_code", phoneNumberId: "phone_test" } },
  ]);
});

test("verification preserves passwords exactly and permits alphanumeric backup codes", async () => {
  const { session, calls } = mockSession();
  await attemptVerification(session, { id: "first-0", stage: "first", factor: { strategy: "password" } }, " password ");
  await attemptVerification(session, firstEmail, " 123456 ");
  await attemptVerification(session, { id: "second-0", stage: "second", factor: { strategy: "backup_code" } }, " abc-def ");
  assert.deepEqual(calls, [
    { method: "attemptFirstFactorVerification", params: { strategy: "password", password: " password " } },
    { method: "attemptFirstFactorVerification", params: { strategy: "email_code", code: "123456" } },
    { method: "attemptSecondFactorVerification", params: { strategy: "backup_code", code: "abc-def" } },
  ]);
});

test("client and business use the identical security screen and auth logic", () => {
  for (const path of [
    "components/AccountSecurityScreen.tsx", "hooks/useAddPassword.ts",
    "lib/passwordSecurity.ts", "app/account-security.tsx",
  ]) {
    assert.equal(readProject(`artifacts/nearbuy/${path}`), readProject(`artifacts/nearbuy-business/${path}`), path);
  }
});

test("all security strings are present in both languages and both apps", () => {
  const paths = ["nearbuy", "nearbuy-business"].flatMap(app =>
    ["en", "fr"].map(lang => `artifacts/${app}/lib/i18n/locales/${lang}.json`));
  const dictionaries = paths.map(path => JSON.parse(readProject(path)).security);
  for (const dictionary of dictionaries) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(dictionaries[0]).sort());
    assert.ok(Object.values(dictionary).every(value => typeof value === "string" && value.length));
  }
});
