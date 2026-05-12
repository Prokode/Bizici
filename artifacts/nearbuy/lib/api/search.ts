/**
 * Public text-search endpoint. Returns flat product hits (with their parent
 * shop info denormalized) within `radiusKm` of the given coordinates.
 */
import { getApiBase } from "./_base";

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
