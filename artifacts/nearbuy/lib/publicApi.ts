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
  ratingAvg: number;
  ratingCount: number;
  distanceMeters: number;
  productCount: number;
  previewProducts: PublicProductPreview[];
  // Set when the shop is `services` or `hybrid`; null for pure product shops.
  kind?: "products" | "services" | "hybrid";
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
  } | null;
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

/**
 * Public bundle returned by `/api/services/providers/{shopId}` — used by the
 * customer provider-detail screen. Mirrors the api-server serializers; we
 * stay decoupled from the generated client because that route is intentionally
 * not part of the OpenAPI surface (public, anonymous, single-shot screen).
 */
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
  };
  provider: PublicProviderProfile | null;
  services: PublicService[];
};

export async function fetchProviderDetail(
  shopId: string,
  opts?: { signal?: AbortSignal },
): Promise<PublicProviderDetail> {
  const res = await fetch(
    `${getApiBase()}/services/providers/${shopId}`,
    { signal: opts?.signal },
  );
  if (!res.ok) {
    throw new Error(`fetchProviderDetail failed: ${res.status}`);
  }
  return (await res.json()) as PublicProviderDetail;
}

export type VisualMatch = PublicSearchHit & { confidence: number };

/**
 * Send a captured photo (base64, no data-URL prefix) + the user's location
 * to the visual-search stub. Returns up to 6 in-radius products as plausible
 * matches with a fake confidence score (0..1). The optional `hint` text
 * biases the match toward products whose name/brand/description contains it.
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
