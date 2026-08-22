import { Types } from "mongoose";

export type ShopLocationInput = {
  countryCode: string;
  cityId: string;
  currencyCode: string;
};

export type ShopCurrencySnapshot = {
  code: string;
  name: string;
  symbol: string;
};

type CurrencyValue = {
  name?: string | null;
  symbol?: string | null;
};

type CountryWithCurrencies = {
  currencies?: Map<string, CurrencyValue> | Record<string, CurrencyValue> | null;
};

type CityRecord = {
  _id: Types.ObjectId;
  name?: string;
  countryCode?: string;
};

export type ShopLocationLookups = {
  findCountry: (countryCode: string) => Promise<CountryWithCurrencies | null>;
  findCity: (
    cityId: Types.ObjectId,
    countryCode: string,
  ) => Promise<CityRecord | null>;
};

export function parseShopLocationInput(
  rawCountryCode: unknown,
  rawCityId: unknown,
  rawCurrencyCode: unknown,
): ShopLocationInput | null {
  const countryCode =
    typeof rawCountryCode === "string"
      ? rawCountryCode.trim().toUpperCase()
      : "";
  const cityId = typeof rawCityId === "string" ? rawCityId.trim() : "";
  const currencyCode =
    typeof rawCurrencyCode === "string"
      ? rawCurrencyCode.trim().toUpperCase()
      : "";

  if (
    !/^[A-Z]{2}$/.test(countryCode) ||
    !Types.ObjectId.isValid(cityId) ||
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    return null;
  }

  return { countryCode, cityId, currencyCode };
}

export function readCountryCurrency(
  currencies: CountryWithCurrencies["currencies"],
  currencyCode: string,
): CurrencyValue | undefined {
  if (currencies instanceof Map) return currencies.get(currencyCode);
  if (currencies && typeof currencies === "object") {
    return currencies[currencyCode];
  }
  return undefined;
}

export async function resolveShopLocationSelection(
  input: ShopLocationInput,
  lookups: ShopLocationLookups,
): Promise<{
  city: CityRecord;
  currency: ShopCurrencySnapshot;
} | null> {
  const cityObjectId = new Types.ObjectId(input.cityId);
  const [country, city] = await Promise.all([
    lookups.findCountry(input.countryCode),
    lookups.findCity(cityObjectId, input.countryCode),
  ]);
  const selectedCurrency = readCountryCurrency(
    country?.currencies,
    input.currencyCode,
  );

  if (!country || !city || !selectedCurrency) return null;

  return {
    city,
    currency: {
      code: input.currencyCode,
      name: selectedCurrency.name ?? input.currencyCode,
      symbol: selectedCurrency.symbol ?? input.currencyCode,
    },
  };
}