/**
 * Public text-search endpoint. Returns flat product hits (with their parent
 * shop info denormalized). Wider search is opt-in and excludes `radiusKm`.
 */
import { getApiBase } from "./_base";
import type { PublicProductSearchHit } from "@workspace/api-client-react";

export type PublicSearchHit = PublicProductSearchHit;

export type SearchPage = {
  products: PublicSearchHit[];
  nextCursor: string | null;
  fuzzyFallback: boolean;
};

type SearchParams = {
  q: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  signal?: AbortSignal;
  scope?: "all";
  cursor?: string;
};

export async function fetchSearchPage(params: SearchParams): Promise<SearchPage> {
  const radiusKm = params.radiusKm ?? 5;
  const url = `${getApiBase()}/public/search?q=${encodeURIComponent(params.q)}&lat=${params.lat}&lng=${params.lng}&radiusKm=${radiusKm}${params.scope ? "&scope=all" : ""}${params.cursor ? `&cursor=${encodeURIComponent(params.cursor)}` : ""}`;
  const res = await fetch(url, { signal: params.signal });
  if (!res.ok) {
    throw new Error(`fetchSearch failed: ${res.status}`);
  }
  const json = await res.json() as Partial<SearchPage>;
  if (!Array.isArray(json.products)) throw new Error("Invalid search response");
  return {
    products: json.products,
    nextCursor: json.nextCursor ?? null,
    fuzzyFallback: json.fuzzyFallback ?? false,
  };
}

export async function fetchSearch(params: SearchParams): Promise<PublicSearchHit[]> {
  return (await fetchSearchPage(params)).products;
}
