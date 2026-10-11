/** Missing route values must never become API identifiers. */
export function normalizeShopId(value: unknown): string | undefined {
  const id = Array.isArray(value) && value.length === 1 ? value[0] : value;
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? id : undefined;
}

export function resolveShopId(local: unknown, inherited: unknown): string | undefined {
  return normalizeShopId(inherited) ?? normalizeShopId(local);
}
