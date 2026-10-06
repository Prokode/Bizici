import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSignInEmailValid,
  passwordSignInParams,
  signInErrorMessage,
} from "../../artifacts/nearbuy-business/lib/signInForm";

describe("Business password sign-in form", () => {
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
