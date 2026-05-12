/**
 * Public bundle returned by `/api/services/providers/{shopId}` — used by the
 * customer provider-detail screen. We stay decoupled from the generated
 * `@workspace/api-client-react` because that route is intentionally not part
 * of the OpenAPI surface (public, anonymous, single-shot screen).
 */
import { getApiBase } from "./_base";

export type PublicServiceCategory = {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
};

export type PublicService = {
  id: string;
  shopId: string;
  sellerId: string;
  title: string;
  slug: string | null;
  description: string | null;
  categories: PublicServiceCategory[];
  pricingType: "fixed" | "hourly" | "quote";
  price: number | null;
  durationMinutes: number | null;
  photos: string[];
  tags: string[];
  isActive: boolean;
  createdAt: string;
  serviceLocation: "at_shop" | "at_customer" | "both" | "inherit";
  effectiveServiceLocation: "at_shop" | "at_customer" | "both";
};

export type PublicProviderProfile = {
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  hideAge: boolean;
  bio: string | null;
  photoUrl: string | null;
  yearsExperience: number | null;
  certifications: string[];
  serviceRadiusKm: number;
  portfolioPhotos: string[];
  isVerified: boolean;
  serviceLocation: "at_shop" | "at_customer" | "both";
};

export type PublicProviderDetail = {
  shop: {
    id: string;
    sellerId: string;
    name: string;
    marketName: string | null;
    stallInfo: string | null;
    latitude: number;
    longitude: number;
    isOpen: boolean;
    kind: "products" | "services" | "hybrid";
    ratingAvg: number;
    ratingCount: number;
    fulfillment: "pickup_only" | "delivery_only" | "both";
    deliveryRadiusKm: number | null;
  };
  provider: PublicProviderProfile | null;
  services: PublicService[];
};

export async function fetchProviderDetail(
  shopId: string,
  opts?: { signal?: AbortSignal },
): Promise<PublicProviderDetail> {
  const res = await fetch(`${getApiBase()}/services/providers/${shopId}`, {
    signal: opts?.signal,
  });
  if (!res.ok) {
    throw new Error(`fetchProviderDetail failed: ${res.status}`);
  }
  return (await res.json()) as PublicProviderDetail;
}
