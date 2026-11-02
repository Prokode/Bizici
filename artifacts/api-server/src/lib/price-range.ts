import { getExchangeRates } from "./exchange-rates";

export type PriceRange = { min?: number; max?: number; currency: string };

export function parsePriceRange(query: Record<string, unknown>): PriceRange | null {
  if (query.minPrice === undefined && query.maxPrice === undefined) return null;
  const amount = (value: unknown) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Invalid price");
    const number = Number(value);
    if (!Number.isFinite(number) || number > 1e12) throw new Error("Invalid price");
    return number;
  };
  const min = amount(query.minPrice), max = amount(query.maxPrice);
  if (typeof query.priceCurrency !== "string" || !/^[A-Z]{3}$/.test(query.priceCurrency) ||
      (min !== undefined && max !== undefined && min > max)) throw new Error("Invalid price range or currency");
  return { min, max, currency: query.priceCurrency };
}

/** Convert the bounds to each seller's major units, without changing stored prices. */
export async function sellerPriceBounds(shops: any[], range: PriceRange | null) {
  const bounds = new Map<string, { min?: number; max?: number }>();
  if (!range) return bounds;
  const codes = shops.map((shop) => shop.currency?.code).filter((code): code is string => !!code);
  const rates = codes.some((code) => code !== range.currency) ? (await getExchangeRates()).rates : null;
  for (const shop of shops) {
    const code = shop.currency?.code;
    if (!code) continue;
    const factor = code === range.currency ? 1 :
      rates?.[code] && rates?.[range.currency] ? rates[code] / rates[range.currency] : null;
    if (factor == null) continue;
    bounds.set(String(shop._id), {
      ...(range.min !== undefined ? { min: range.min * factor } : {}),
      ...(range.max !== undefined ? { max: range.max * factor } : {}),
    });
  }
  return bounds;
}

export function productPriceClauses(shops: any[], bounds: Map<string, { min?: number; max?: number }>) {
  return shops.flatMap((shop) => {
    const bound = bounds.get(String(shop._id));
    if (!bound) return [];
    // Products use hundredths, including FCFA; ceil/floor keep integer bounds inclusive.
    return [{ shop: shop._id, price: {
      ...(bound.min !== undefined ? { $gte: Math.ceil(bound.min * 100 - 1e-7) } : {}),
      ...(bound.max !== undefined ? { $lte: Math.floor(bound.max * 100 + 1e-7) } : {}),
    } }];
  });
}

export function servicePriceMatches(
  shopId: string, service: { price?: number | null; pricingType: string },
  bounds: Map<string, { min?: number; max?: number }>,
) {
  const bound = bounds.get(shopId);
  const price = service.price;
  return !!bound && service.pricingType !== "quote" && typeof price === "number" && Number.isFinite(price) &&
    (bound.min === undefined || price + 1e-9 >= bound.min) &&
    (bound.max === undefined || price - 1e-9 <= bound.max);
}
