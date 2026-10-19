/** Public image-matching endpoint (`POST /api/public/visual-search`). */
import { getApiBase } from "./_base";
import type { PublicSearchHit } from "./search";

export type VisualMatch = PublicSearchHit & { confidence: number };

export type VisualSearchErrorCode =
  | "photo_missing"
  | "photo_too_large"
  | "invalid_image"
  | "service_unavailable"
  | "request_failed";

export class VisualSearchError extends Error {
  constructor(public readonly code: VisualSearchErrorCode) {
    super(code);
    this.name = "VisualSearchError";
  }
}

const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024;

/** Send the actual captured image, location, and optional radius/hint. */
export async function fetchVisualSearch(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  hint?: string;
  signal?: AbortSignal;
}): Promise<VisualMatch[]> {
  const rawImage = params.imageBase64?.trim();
  if (!rawImage) throw new VisualSearchError("photo_missing");
  const prefixMatch = /^data:(image\/[^;]+);base64,/i.exec(rawImage);
  const imageMimeType = (prefixMatch?.[1] ?? params.imageMimeType ?? "").toLowerCase();
  const imageBase64 = prefixMatch
    ? rawImage.slice(prefixMatch[0].length)
    : rawImage;
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new VisualSearchError("photo_too_large");
  }
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(imageMimeType) ||
    imageBase64.length === 0
  ) {
    throw new VisualSearchError("invalid_image");
  }

  const body: Record<string, unknown> = {
    lat: params.lat,
    lng: params.lng,
    radiusKm: params.radiusKm ?? 5,
    imageBase64,
    imageMimeType,
    hint: params.hint ?? "",
  };
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/public/visual-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: params.signal,
      body: JSON.stringify(body),
    });
  } catch {
    throw new VisualSearchError("request_failed");
  }
  if (!res.ok) {
    if (res.status === 413) throw new VisualSearchError("photo_too_large");
    if (res.status === 400 || res.status === 415) {
      throw new VisualSearchError("invalid_image");
    }
    if (res.status === 502 || res.status === 503) {
      throw new VisualSearchError("service_unavailable");
    }
    throw new VisualSearchError("request_failed");
  }
  const json = (await res.json()) as { matches?: unknown };
  if (!Array.isArray(json.matches)) {
    throw new VisualSearchError("request_failed");
  }
  return json.matches as VisualMatch[];
}
