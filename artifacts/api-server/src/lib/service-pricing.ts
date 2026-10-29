export type ServicePricingOption = {
  label: string | null;
  durationMinutes: number;
  price: number;
};

/** Option prices use major currency units, like public service prices. */
export function parseServicePricingOptions(value: unknown, pricingType: string): ServicePricingOption[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("pricingOptions must be an array of at most 20 offers");
  }
  if (value.length && pricingType !== "fixed") {
    throw new Error("pricingOptions are only available for fixed pricing");
  }
  return value.map((option) => {
    if (!option || typeof option !== "object" ||
      typeof option.price !== "number" || !Number.isFinite(option.price) ||
      option.price < 0 || option.price > Number.MAX_SAFE_INTEGER / 100 ||
      !Number.isSafeInteger(option.durationMinutes) || option.durationMinutes < 1 ||
      (option.label != null && (typeof option.label !== "string" || option.label.trim().length > 80))) {
      throw new Error("Each offer requires a valid price, a positive whole-minute duration, and an optional label of at most 80 characters");
    }
    return {
      label: option.label?.trim() || null,
      durationMinutes: option.durationMinutes,
      price: Math.round(option.price * 100) / 100,
    };
  });
}

export function cheapestServiceOption(options: ServicePricingOption[]) {
  return options.reduce<ServicePricingOption | null>((lowest, option) =>
    !lowest || option.price < lowest.price ? option : lowest, null);
}
