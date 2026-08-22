export function parseAllowedOrigins(rawValue: string | undefined): Set<string> {
  return new Set(
    (rawValue ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  return (
    origin === undefined ||
    allowedOrigins.size === 0 ||
    allowedOrigins.has(origin)
  );
}
