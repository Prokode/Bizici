/** Preserve legacy single-price units; new multi-offer prices use major units. */
export function serviceFormValues(price: string, duration: string, needsPrice: boolean) {
  const normalizedPrice = price.trim().replace(",", ".");
  const normalizedDuration = duration.trim();
  if (needsPrice && normalizedPrice && (!/^\d+(?:\.\d+)?$/.test(normalizedPrice) ||
    !Number.isSafeInteger(Math.round(Number(normalizedPrice) * 100)))) {
    throw new Error("invalidPrice");
  }
  if (normalizedDuration && (!/^\d+$/.test(normalizedDuration) ||
    !Number.isSafeInteger(Number(normalizedDuration)) || Number(normalizedDuration) < 1)) {
    throw new Error("invalidDuration");
  }
  return {
    price: needsPrice && normalizedPrice ? Math.round(Number(normalizedPrice) * 100) : null,
    durationMinutes: normalizedDuration ? Number(normalizedDuration) : null,
  };
}

export function serviceSaveError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  // Never print proxy/Express HTML error pages in a mobile form.
  return message && !/<(?:!doctype|html|head|body|pre)\b/i.test(message) ? message : fallback;
}
