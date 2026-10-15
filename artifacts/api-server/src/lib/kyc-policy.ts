// Launch policy: retain KYC records/review tools, but do not require approval.
// Re-enable only after an explicit product decision, together with the seller
// KycBanner flag. Never rewrite stored statuses to make shops appear verified.
export const KYC_ENFORCEMENT_ENABLED: boolean = false;

export function publicShopKycFilter(enforce = KYC_ENFORCEMENT_ENABLED): Record<string, string> {
  return enforce ? { "kyc.status": "approved" } : {};
}

export function isPublicShopKycAllowed(
  status: string | null | undefined,
  enforce = KYC_ENFORCEMENT_ENABLED,
): boolean {
  return !enforce || status === "approved";
}
