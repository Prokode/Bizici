import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSignInEmailValid,
  passwordSignInParams,
  signInErrorMessage,
  signInErrorReference,
} from "../../artifacts/nearbuy-business/lib/signInForm";

describe("Business password sign-in form", () => {
  it("removes zero-width and directional paste formatting before validation and submission", () => {
    for (const marker of ["\u200B", "\u200E", "\u200F", "\u202A", "\u202C", "\u2060", "\u2066", "\u2069", "\uFEFF"]) {
      const pasted = `${marker}shopper${marker}@example.com${marker}`;
      assert.equal(isSignInEmailValid(pasted), true);
      assert.deepEqual(passwordSignInParams(pasted, ` pass${marker}word `), {
        identifier: "shopper@example.com",
        password: ` pass${marker}word `,
      });
    }
  });
  it("does not silently change visible typos and rejects remaining control characters", () => {
    for (const email of ["shop per@example.com", "shopper@example.com\u0000", "shopper@exa\u200Dmple.com"]) {
      assert.equal(isSignInEmailValid(email), false);
    }
    assert.equal(passwordSignInParams("shop per@example.com", "password").identifier, "shop per@example.com");
  });
  it("reads Clerk API response errors rather than the outer Error message", () => {
    const error = {
      message: "Identifier is invalid.",
      errors: [{ code: "form_identifier_not_found", message: "Not found" }],
    };
    assert.equal(signInErrorMessage(error, "Check credentials", "Failed"), "Check credentials");
    assert.equal(signInErrorReference(error), "form_identifier_not_found");
  });
  it("preserves nested actionable details and rejects unsafe diagnostic references", () => {
    assert.equal(signInErrorMessage({ errors: [{ code: "form_param_format_invalid", long_message: "Check the email format" }] }, "Credentials", "Failed"), "Check the email format");
    assert.equal(signInErrorReference({ code: "person@example.com" }), "unknown_error");
    assert.equal(signInErrorMessage(null, "Credentials", "Failed"), "Failed");
    assert.equal(signInErrorReference({ errors: [] }), "unknown_error");
  });
  it("trims pasted email whitespace but preserves the password exactly", () => {
    assert.deepEqual(passwordSignInParams("\u00a0 shopper@example.com \n", " pass word "), {
      identifier: "shopper@example.com",
      password: " pass word ",
    });
  });
  it("validates email without rejecting normal aliases", () => {
    assert.equal(isSignInEmailValid(" shopper+shop@example.com "), true);
    for (const value of ["", "   ", "shopper", "shop per@example.com"]) {
      assert.equal(isSignInEmailValid(value), false);
    }
  });
  it("uses one neutral message for rejected credentials", () => {
    for (const code of ["form_identifier_not_found", "form_identifier_invalid", "form_password_incorrect"]) {
      assert.equal(signInErrorMessage({ code, message: "Identifier is invalid." }, "Check credentials", "Failed"), "Check credentials");
    }
  });
  it("preserves other actionable provider errors", () => {
    assert.equal(signInErrorMessage({ code: "too_many_requests", message: "Rate limited", longMessage: "Try again later" }, "Check credentials", "Failed"), "Try again later");
    assert.equal(signInErrorMessage({}, "Check credentials", "Failed"), "Failed");
  });
});
