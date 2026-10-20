export type ShopCurrency = { code: string; name?: string; symbol?: string };
export type RateTable = { updatedAt: string; rates: Record<string, number> };

/** Product amounts use the project's hundredths convention, even for XOF. */
export function convertPrice(
  minorAmount: number,
  source: string,
  target: string,
  table: RateTable | undefined,
  now = Date.now(),
): number | null {
  if (!Number.isFinite(minorAmount)) return null;
  if (source === target) return minorAmount / 100;
  const date = Date.parse(table?.updatedAt ?? "");
  const from = table?.rates[source];
  const to = table?.rates[target];
  if (!Number.isFinite(date) || now - date > 48 * 60 * 60 * 1000 || date > now + 300_000 ||
      !from || !to || !Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0) return null;
  return (minorAmount / 100) / from * to;
}

export function formatCurrencyAmount(amount: number, code: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}
