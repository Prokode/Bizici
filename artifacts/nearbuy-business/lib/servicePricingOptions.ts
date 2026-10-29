export type ServicePricingOption = {
  label?: string | null;
  durationMinutes: number;
  price: number;
};

export type PricingOptionDraft = {
  label: string;
  durationMinutes: string;
  price: string;
};

export type PricingOptionsValidation =
  | { valid: true; options: ServicePricingOption[] }
  | { valid: false; errorKey: "newService.pricingOptionRequired" | "newService.pricingOptionInvalid" | "newService.pricingOptionLimit" };

const MAX_PRICING_OPTIONS = 20;

function parsePrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= Number.MAX_SAFE_INTEGER / 100 ? parsed : null;
}

function parseDuration(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validatePricingOptionDrafts(
  drafts: PricingOptionDraft[],
): PricingOptionsValidation {
  if (drafts.length > MAX_PRICING_OPTIONS) {
    return { valid: false, errorKey: "newService.pricingOptionLimit" };
  }
  if (drafts.length === 0) {
    return { valid: false, errorKey: "newService.pricingOptionRequired" };
  }
  const options: ServicePricingOption[] = [];
  for (const draft of drafts) {
    const durationMinutes = parseDuration(draft.durationMinutes);
    const price = parsePrice(draft.price);
    if (durationMinutes === null || price === null || draft.label.trim().length > 80) {
      return { valid: false, errorKey: "newService.pricingOptionInvalid" };
    }
    options.push({
      label: draft.label.trim() || null,
      durationMinutes,
      price,
    });
  }
  return { valid: true, options };
}

export function toPricingOptionDrafts(options?: ServicePricingOption[] | null): PricingOptionDraft[] {
  if (!options?.length) {
    return [{ label: "", durationMinutes: "", price: "" }];
  }
  return options.slice(0, MAX_PRICING_OPTIONS).map((option) => ({
    label: option.label ?? "",
    durationMinutes: String(option.durationMinutes),
    price: String(option.price),
  }));
}
