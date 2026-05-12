/**
 * Public visual-search endpoint (`POST /api/public/visual-search`). The
 * current backend matcher is a stub that ignores the image payload and
 * returns up to 6 in-radius products with a fake confidence score. The
 * `hint` text biases matches whose name/brand/description contains it.
 */
import { getApiBase } from "./_base";
import type { PublicSearchHit } from "./search";

export type VisualMatch = PublicSearchHit & { confidence: number };

/**
 * Send a captured photo (base64, no data-URL prefix) + the user's location
 * to the visual-search stub.
 */
export async function fetchVisualSearch(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  /**
   * Optional base64-encoded image. The current backend matcher is a mock
   * and IGNORES the payload, so we omit it from the request by default to
   * keep bandwidth and the public endpoint's attack surface small. Set
   * `sendImage: true` once a real visual-matching backend is wired up.
   */
  imageBase64?: string | null;
  sendImage?: boolean;
  hint?: string;
  signal?: AbortSignal;
}): Promise<VisualMatch[]> {
  const body: Record<string, unknown> = {
    lat: params.lat,
    lng: params.lng,
    radiusKm: params.radiusKm ?? 5,
    hint: params.hint ?? "",
  };
  if (params.sendImage && params.imageBase64) {
    body.imageBase64 = params.imageBase64;
  }
  const res = await fetch(`${getApiBase()}/public/visual-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: params.signal,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`fetchVisualSearch failed: ${res.status}`);
  }
  const json = (await res.json()) as { matches: VisualMatch[] };
  return json.matches ?? [];
}
