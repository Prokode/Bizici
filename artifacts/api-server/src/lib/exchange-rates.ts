export type ExchangeRates = {
  base: string;
  updatedAt: string;
  rates: Record<string, number>;
};

const CACHE_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
let cached: { at: number; value: ExchangeRates } | undefined;
let pending: Promise<ExchangeRates> | undefined;

export function parseExchangeRates(data: unknown, now = Date.now()): ExchangeRates {
  const raw = data as Record<string, unknown> | null;
  const updated = Number(raw?.time_last_update_unix) * 1000;
  if (raw?.result !== "success" || raw.base_code !== "EUR" ||
      !Number.isFinite(updated) || updated > now + 300_000 || now - updated > MAX_AGE_MS ||
      !raw.rates || typeof raw.rates !== "object") {
    throw new Error("Invalid or expired exchange rates");
  }
  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(raw.rates)) {
    if (/^[A-Z]{3}$/.test(code) && typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }
  if (rates.EUR !== 1 || !rates.XOF || !rates.USD) throw new Error("Missing reference currencies");
  return { base: "EUR", updatedAt: new Date(updated).toISOString(), rates };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  if (cached && Date.now() - cached.at < CACHE_MS &&
      Date.now() - Date.parse(cached.value.updatedAt) < MAX_AGE_MS) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch("https://open.er-api.com/v6/latest/EUR", {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Exchange rate provider unavailable");
    const value = parseExchangeRates(await response.json());
    cached = { at: Date.now(), value };
    return value;
  })();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
