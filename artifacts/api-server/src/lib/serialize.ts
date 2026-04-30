import type {
  ShopDoc,
  ProductDoc,
  CategoryDoc,
  DiscountDoc,
  ShopInvitationDoc,
  BroadcastRequestDoc,
} from "@workspace/db";

// `viewerIsOwner` controls age visibility on the embedded provider profile.
// Owners always see the raw value. For everyone else, the age field is
// nulled when the provider opted to hide it.
export function serializeShop(
  s: any,
  opts: { viewerIsOwner?: boolean; distanceKm?: number | null } = {},
) {
  const coords: number[] = s.location?.coordinates ?? [0, 0];
  const kind = (s.kind ?? "products") as "products" | "services" | "hybrid";
  return {
    id: String(s._id),
    sellerId: String(s.sellerId?._id ?? s.sellerId),
    name: s.name,
    marketName: s.marketName ?? null,
    stallInfo: s.stallInfo ?? null,
    longitude: Number(coords[0] ?? 0),
    latitude: Number(coords[1] ?? 0),
    isOpen: !!s.isOpen,
    kind,
    serviceProvider: s.serviceProvider
      ? serializeProviderProfile(s.serviceProvider, {
          viewerIsOwner: opts.viewerIsOwner ?? false,
        })
      : null,
    ratingAvg: typeof s.ratingAvg === "number" ? s.ratingAvg : 0,
    ratingCount: typeof s.ratingCount === "number" ? s.ratingCount : 0,
    distanceKm:
      typeof opts.distanceKm === "number" ? opts.distanceKm : undefined,
  };
}

export function serializeProviderProfile(
  p: any,
  opts: { viewerIsOwner?: boolean } = {},
) {
  const hideAge = !!p?.hideAge;
  const showAge = opts.viewerIsOwner === true || !hideAge;
  return {
    firstName: p?.firstName ?? null,
    lastName: p?.lastName ?? null,
    age: showAge && typeof p?.age === "number" ? p.age : null,
    hideAge,
    bio: p?.bio ?? null,
    photoUrl: p?.photoUrl ?? null,
    yearsExperience:
      typeof p?.yearsExperience === "number" ? p.yearsExperience : null,
    certifications: Array.isArray(p?.certifications) ? p.certifications : [],
    serviceRadiusKm: typeof p?.serviceRadiusKm === "number" ? p.serviceRadiusKm : 10,
    portfolioPhotos: Array.isArray(p?.portfolioPhotos) ? p.portfolioPhotos : [],
    isVerified: !!p?.isVerified,
  };
}

export function serializeReview(r: any) {
  // `customerUserId` may be either a raw ObjectId or a populated User doc
  // (when the route does .populate("customerUserId", "name")).
  const u = r.customerUserId;
  const populated = u && typeof u === "object" && "_id" in u;
  return {
    id: String(r._id),
    shopId: String(r.shopId?._id ?? r.shopId),
    customerUserId: populated ? String(u._id) : String(u),
    customerName: populated ? (u.name ?? null) : null,
    rating: Number(r.rating ?? 0),
    comment: r.comment ?? null,
    createdAt: (r.createdAt instanceof Date
      ? r.createdAt
      : new Date(r.createdAt)
    ).toISOString(),
    updatedAt: (r.updatedAt instanceof Date
      ? r.updatedAt
      : new Date(r.updatedAt)
    ).toISOString(),
  };
}

export function serializeCategory(c: any) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    parent: c.parent ? String(c.parent) : null,
    icon: c.icon ?? null,
    kind: (c.kind ?? "product") as "product" | "service",
  };
}

export function serializeService(s: any) {
  const cats = Array.isArray(s.categories)
    ? s.categories.map((c: any) =>
        c && typeof c === "object" && c._id
          ? serializeCategory(c)
          : {
              id: String(c),
              name: "",
              slug: "",
              parent: null,
              icon: null,
              kind: "service" as const,
            },
      )
    : [];
  return {
    id: String(s._id),
    shopId: String(s.shop?._id ?? s.shop),
    sellerId: String(s.seller?._id ?? s.seller),
    title: s.title,
    slug: s.slug ?? null,
    description: s.description ?? null,
    categories: cats,
    pricingType: (s.pricingType ?? "quote") as "fixed" | "hourly" | "quote",
    price: typeof s.price === "number" ? s.price : null,
    durationMinutes:
      typeof s.durationMinutes === "number" ? s.durationMinutes : null,
    photos: Array.isArray(s.photos) ? s.photos : [],
    tags: Array.isArray(s.tags) ? s.tags : [],
    isActive: s.isActive !== false,
    createdAt: (s.createdAt instanceof Date
      ? s.createdAt
      : new Date(s.createdAt ?? Date.now())
    ).toISOString(),
  };
}

export function serializeDiscount(d: any) {
  return {
    id: String(d._id),
    productId: String(d.product?._id ?? d.product),
    code: d.code ?? null,
    percentOff: Number(d.percentOff ?? 0),
    amountOff: Number(d.amountOff ?? 0),
    validFrom: (d.validFrom instanceof Date ? d.validFrom : new Date(d.validFrom)).toISOString(),
    validTo: d.validTo ? (d.validTo instanceof Date ? d.validTo : new Date(d.validTo)).toISOString() : null,
    isActive: !!d.isActive,
  };
}

export function serializeProduct(p: any) {
  const cats = Array.isArray(p.categories)
    ? p.categories.map((c: any) =>
        c && typeof c === "object" && c._id
          ? serializeCategory(c)
          : { id: String(c), name: "", slug: "", parent: null, icon: null },
      )
    : [];
  return {
    id: String(p._id),
    shopId: String(p.shop?._id ?? p.shop),
    sellerId: String(p.seller?._id ?? p.seller),
    name: p.name,
    slug: p.slug ?? null,
    brand: p.brand ?? null,
    description: p.description ?? null,
    price: typeof p.price === "number" ? p.price : 0,
    quantity: typeof p.quantity === "number" ? p.quantity : 0,
    colors: Array.isArray(p.colors) ? p.colors : [],
    photos: Array.isArray(p.photos) ? p.photos : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    categories: cats,
    weight: p.weight ?? null,
    dimension: p.dimension ?? null,
    variations: Array.isArray(p.variations)
      ? p.variations.map((v: any) => ({
          id: v._id ? String(v._id) : null,
          sku: v.sku,
          price: v.price,
          quantity: v.quantity,
          colors: v.colors ?? [],
          photos: v.photos ?? [],
          dimension: v.dimension ?? null,
        }))
      : [],
    rating: p.rating ?? null,
    reviews: typeof p.reviews === "number" ? p.reviews : 0,
    totalSell: typeof p.totalSell === "number" ? p.totalSell : 0,
    applyDiscount: !!p.applyDiscount,
    tags: Array.isArray(p.tags) ? p.tags : [],
    stockStatus: (p.stockStatus ?? "in_stock") as "in_stock" | "out_of_stock",
    imageUrl: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null,
    category: cats.length > 0 ? cats[0].name : null,
    lastVerifiedAt: (p.lastVerifiedAt instanceof Date
      ? p.lastVerifiedAt
      : new Date(p.lastVerifiedAt ?? Date.now())
    ).toISOString(),
  };
}

export function serializeInvitation(i: any) {
  return {
    id: String(i._id),
    email: i.email,
    role: i.role as "seller" | "sub_seller",
    createdAt: (i.createdAt instanceof Date ? i.createdAt : new Date(i.createdAt)).toISOString(),
  };
}

export function serializeBroadcastRequest(r: any, distanceMeters = 0) {
  const coords: number[] = r.location?.coordinates ?? [0, 0];
  return {
    id: String(r._id),
    userId: r.userId ?? null,
    query: r.query,
    longitude: Number(coords[0] ?? 0),
    latitude: Number(coords[1] ?? 0),
    status: (r.status ?? "active") as "active" | "found" | "expired",
    distanceMeters: Math.round(distanceMeters),
  };
}
