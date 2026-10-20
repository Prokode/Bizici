/** Database photos are stable URLs/paths, never short-lived upload URLs or device files. */
export function resolveBrandPhotoUrl(uri: string | null | undefined, domain: string | undefined): string | null {
  if (!uri) return null;
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith("/api/") && domain) return `https://${domain}${uri}`;
  return null;
}
