import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatShopPrice } from "../../artifacts/nearbuy-business/lib/currency";

describe("shop price formatting", () => {
  it("formats XOF minor units with the shop currency", () => {
    const value = formatShopPrice(
      1250,
      { code: "XOF", name: "West African CFA franc", symbol: "Fr" },
      "fr-FR",
    );
    assert.match(value, /12,50/);
    assert.match(value, /CFA|XOF/);
  });

  it("formats EUR and USD while preserving two decimal minor units", () => {
    assert.match(
      formatShopPrice(
        1250,
        { code: "EUR", name: "Euro", symbol: "€" },
        "en-US",
      ),
      /€12\.50/,
    );
    assert.match(
      formatShopPrice(
        1250,
        { code: "USD", name: "US Dollar", symbol: "$" },
        "en-US",
      ),
      /\$12\.50/,
    );
  });

  it("uses USD for legacy shops without a currency snapshot", () => {
    assert.equal(formatShopPrice(1250, null, "en-US"), "$12.50");
  });

  it("uses the saved symbol and code when Intl rejects a currency", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "NumberFormat");
    Object.defineProperty(Intl, "NumberFormat", {
      configurable: true,
      value: function BrokenNumberFormat() {
        throw new RangeError("unsupported currency");
      },
    });

    try {
      assert.equal(
        formatShopPrice(
          1250,
          { code: "LOCAL", name: "Local currency", symbol: "¤" },
          "en-US",
        ),
        "¤12.50 LOCAL",
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, "NumberFormat", descriptor);
      }
    }
  });
});