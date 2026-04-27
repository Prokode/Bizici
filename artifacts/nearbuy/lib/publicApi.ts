/**
 * Tiny typed wrapper around the public (unauthenticated) endpoints of the
 * NearBuy api-server. Kept separate from the generated `@workspace/api-client-react`
 * so the customer app can browse the map without needing a Clerk session.
 */

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
  distanceMeters: number;
  productCount: number;
  previewProducts: PublicProductPreview[];
};

export type KarmaEvent = {
  id: string;
  kind: "welcome" | "stock_confirmation" | "stock_report" | "broadcast";
  points: number;
  note: string | null;
  createdAt: string;
};

export type KarmaSummary = {
  points: number;
  recentEvents: KarmaEvent[];
};

/**
 * Fetch the signed-in user's Karma summary. Requires a Clerk session — caller
 * must have wired `setAuthTokenGetter` (done in `app/(tabs)/_layout.tsx`).
 */
export async function fetchMyKarma(
  baseUrl: string,
  token: string,
): Promise<KarmaSummary> {
  const res = await fetch(`${baseUrl}/api/me/karma`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchMyKarma failed: ${res.status}`);
  return (await res.json()) as KarmaSummary;
}

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

function getApiBase(): string {
  const dom = process.env.EXPO_PUBLIC_DOMAIN;
  if (!dom) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${dom}/api`;
}

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

export type PublicSearchHit = {
  id: string;
  shopId: string;
  shopName: string;
  shopMarketName: string | null;
  shopIsOpen: boolean;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  photo: string | null;
  distanceMeters: number;
};

export async function fetchSearch(params: {
  q: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  signal?: AbortSignal;
}): Promise<PublicSearchHit[]> {
  const radiusKm = params.radiusKm ?? 5;
  const url = `${getApiBase()}/public/search?q=${encodeURIComponent(params.q)}&lat=${params.lat}&lng=${params.lng}&radiusKm=${radiusKm}`;
  const res = await fetch(url, { signal: params.signal });
  if (!res.ok) {
    throw new Error(`fetchSearch failed: ${res.status}`);
  }
  const json = (await res.json()) as { products: PublicSearchHit[] };
  return json.products ?? [];
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
