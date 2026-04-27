import type {
  ShopDoc,
  ProductDoc,
  CategoryDoc,
  DiscountDoc,
  ShopInvitationDoc,
  BroadcastRequestDoc,
} from "@workspace/db";

export function serializeShop(s: any) {
  const coords: number[] = s.location?.coordinates ?? [0, 0];
  return {
    id: String(s._id),
    sellerId: String(s.sellerId?._id ?? s.sellerId),
    name: s.name,
    marketName: s.marketName ?? null,
    stallInfo: s.stallInfo ?? null,
    longitude: Number(coords[0] ?? 0),
    latitude: Number(coords[1] ?? 0),
    isOpen: !!s.isOpen,
  };
}

export function serializeCategory(c: any) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    parent: c.parent ? String(c.parent) : null,
    icon: c.icon ?? null,
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
