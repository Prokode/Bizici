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
