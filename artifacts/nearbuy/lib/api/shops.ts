/**
 * Public (unauthenticated) shop endpoints: nearby map list, shop detail with
 * products, and customer reviews. Bypasses `customFetch` because no auth
 * token is required (and the customer browses the map before sign-in).
 */
import { getApiBase } from "./_base";

export type PublicProductPreview = {
  id: string;
  name: string;
  price: number;
  photo: string | null;
};

export type PublicShop = {
  id: string;
  sellerId: string;
  name: string;
  marketName: string | null;
  stallInfo: string | null;
  longitude: number;
  latitude: number;
  isOpen: boolean;
  ratingAvg: number;
  ratingCount: number;
  distanceMeters: number;
  productCount: number;
  previewProducts: PublicProductPreview[];
  // Set when the shop is `services` or `hybrid`; null for pure product shops.
  kind?: "products" | "services" | "hybrid";
  fulfillment?: "pickup_only" | "delivery_only" | "both";
  deliveryRadiusKm?: number | null;
  serviceProvider?: {
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
  } | null;
};

export type PublicProduct = {
  id: string;
  shopId: string;
  sellerId: string;
  name: string;
  slug: string | null;
  brand: string | null;
  description: string | null;
  price: number;
  quantity: number;
  photos: string[];
  stockStatus: "in_stock" | "out_of_stock";
};

export type PublicShopDetail = {
  shop: Omit<PublicShop, "distanceMeters" | "productCount" | "previewProducts">;
  products: PublicProduct[];
};

export type PublicShopReview = {
  id: string;
  shopId: string;
  customerUserId: string;
  customerName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchNearbyShops(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  signal?: AbortSignal;
}): Promise<PublicShop[]> {
  const radiusKm = params.radiusKm ?? 5;
  const url = `${getApiBase()}/public/shops?lat=${params.lat}&lng=${params.lng}&radiusKm=${radiusKm}`;
  const res = await fetch(url, { signal: params.signal });
  if (!res.ok) {
    throw new Error(`fetchNearbyShops failed: ${res.status}`);
  }
  const json = (await res.json()) as { shops: PublicShop[] };
  return json.shops ?? [];
}

export async function fetchShopDetail(
  shopId: string,
  opts?: { signal?: AbortSignal },
): Promise<PublicShopDetail> {
  const res = await fetch(`${getApiBase()}/public/shops/${shopId}`, {
    signal: opts?.signal,
  });
  if (!res.ok) {
    throw new Error(`fetchShopDetail failed: ${res.status}`);
  }
  return (await res.json()) as PublicShopDetail;
}

export async function fetchShopReviews(
  shopId: string,
  opts?: { limit?: number; before?: string; signal?: AbortSignal },
): Promise<{ reviews: PublicShopReview[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (opts?.limit) qs.set("limit", String(opts.limit));
  if (opts?.before) qs.set("before", opts.before);
  const url = `${getApiBase()}/public/shops/${shopId}/reviews${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { signal: opts?.signal });
  if (!res.ok) {
    throw new Error(`fetchShopReviews failed: ${res.status}`);
  }
  return (await res.json()) as {
    reviews: PublicShopReview[];
    nextCursor: string | null;
  };
}
