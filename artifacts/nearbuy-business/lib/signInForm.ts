/** Normalize the identifier only. Spaces can be meaningful in passwords. */
export function passwordSignInParams(email: string, password: string) {
  return { identifier: email.trim(), password };
}

export function isSignInEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function signInErrorMessage(
  error: { code?: string; message?: string; longMessage?: string },
  credentialMessage: string,
  fallback: string,
) {
  if (
    ["form_identifier_not_found", "form_identifier_invalid", "form_password_incorrect"].includes(
      error.code ?? "",
    )
  ) {
    return credentialMessage;
  }
  return error.longMessage || error.message || fallback;
}
