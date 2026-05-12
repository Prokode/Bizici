/**
 * Shared base-URL helper for the *public* (anonymous) endpoints of the
 * NearBuy api-server. The auth-required wrappers go through `customFetch`
 * from `@workspace/api-client-react` instead, which already knows the base
 * URL + Clerk Bearer token. Public endpoints have no token to attach, so
 * we hit them with bare `fetch()` against this URL.
 */
export function getApiBase(): string {
  const dom = process.env.EXPO_PUBLIC_DOMAIN;
  if (!dom) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${dom}/api`;
}
