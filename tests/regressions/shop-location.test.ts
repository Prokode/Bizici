import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";

import {
  parseShopLocationInput,
  readCountryCurrency,
  resolveShopLocationSelection,
} from "../../artifacts/api-server/src/lib/shopLocation";
import { serializeShop } from "../../artifacts/api-server/src/lib/serialize";

const cityId = "6a88e73e8131346d13a7912e";

describe("shop country, city, and currency validation", () => {
  it("normalizes a valid request and rejects malformed identifiers", () => {
    assert.deepEqual(
      parseShopLocationInput(" tg ", ` ${cityId} `, " xof "),
      {
        countryCode: "TG",
        cityId,
        currencyCode: "XOF",
      },
    );
    assert.equal(parseShopLocationInput("TGO", cityId, "XOF"), null);
    assert.equal(parseShopLocationInput("TG", "not-an-object-id", "XOF"), null);
    assert.equal(parseShopLocationInput("TG", cityId, "EURO"), null);
  });

  it("reads currencies from hydrated maps and lean objects", () => {
    const xof = { name: "West African CFA franc", symbol: "Fr" };
    assert.deepEqual(readCountryCurrency(new Map([["XOF", xof]]), "XOF"), xof);
    assert.deepEqual(readCountryCurrency({ XOF: xof }, "XOF"), xof);
    assert.equal(readCountryCurrency({ XOF: xof }, "USD"), undefined);
  });

  it("accepts a city and currency belonging to the selected country", async () => {
    const requestedCityIds: string[] = [];
    const result = await resolveShopLocationSelection(
      { countryCode: "TG", cityId, currencyCode: "XOF" },
      {
        findCountry: async (countryCode) => {
          assert.equal(countryCode, "TG");
          return {
            currencies: {
              XOF: { name: "West African CFA franc", symbol: "Fr" },
            },
          };
        },
        findCity: async (requestedCityId, countryCode) => {
          requestedCityIds.push(String(requestedCityId));
          assert.equal(countryCode, "TG");
          return {
            _id: new Types.ObjectId(cityId),
            name: "Lome",
            countryCode: "TG",
          };
        },
      },
    );

    assert.deepEqual(requestedCityIds, [cityId]);
    assert.deepEqual(result?.currency, {
      code: "XOF",
      name: "West African CFA franc",
      symbol: "Fr",
    });
    assert.equal(result?.city.name, "Lome");
  });

  it("rejects a city from another country", async () => {
    const result = await resolveShopLocationSelection(
      { countryCode: "TG", cityId, currencyCode: "XOF" },
      {
        findCountry: async () => ({
          currencies: { XOF: { name: "CFA franc", symbol: "Fr" } },
        }),
        findCity: async () => null,
      },
    );
    assert.equal(result, null);
  });

  it("rejects a currency not offered by the selected country", async () => {
    const result = await resolveShopLocationSelection(
      { countryCode: "TG", cityId, currencyCode: "USD" },
      {
        findCountry: async () => ({
          currencies: { XOF: { name: "CFA franc", symbol: "Fr" } },
        }),
        findCity: async () => ({
          _id: new Types.ObjectId(cityId),
          name: "Lome",
          countryCode: "TG",
        }),
      },
    );
    assert.equal(result, null);
  });
});

describe("shop serialization", () => {
  const baseShop = {
    _id: new Types.ObjectId(),
    sellerId: new Types.ObjectId(),
    name: "Boutique test",
    location: { type: "Point", coordinates: [1.22, 6.13] },
  };

  it("retains country, city, and the currency snapshot", () => {
    const serialized = serializeShop({
      ...baseShop,
      countryCode: "TG",
      city: {
        _id: new Types.ObjectId(cityId),
        name: "Lome",
        countryCode: "TG",
      },
      currency: {
        code: "XOF",
        name: "West African CFA franc",
        symbol: "Fr",
      },
    });

    assert.equal(serialized.countryCode, "TG");
    assert.deepEqual(serialized.city, {
      id: cityId,
      name: "Lome",
      countryCode: "TG",
    });
    assert.deepEqual(serialized.currency, {
      code: "XOF",
      name: "West African CFA franc",
      symbol: "Fr",
    });
  });

  it("keeps legacy shops without location or currency compatible", () => {
    const serialized = serializeShop(baseShop);
    assert.equal(serialized.countryCode, null);
    assert.equal(serialized.city, null);
    assert.equal(serialized.currency, null);
  });
});