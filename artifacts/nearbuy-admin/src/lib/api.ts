/**
 * Tiny typed wrapper around the NearBuy admin API. All endpoints require an
 * admin Bearer token (except /admin/auth/login).
 */

const TOKEN_KEY = "nb_admin_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && !path.endsWith("/admin/auth/login")) {
      const base = import.meta.env.BASE_URL ?? "/";
      window.location.href = base + "login";
    }
    throw new ApiError("Authentification requise", 401);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ??
      `Erreur ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ----- Types ---------------------------------------------------------------

export type AdminRole = "super_admin" | "admin" | "moderator";

export type Admin = {
  id: string;
  username: string;
  role: AdminRole;
  isRoot: boolean;
};

export type AdminFull = Admin & {
  createdAt: string;
  lastLoginAt: string | null;
};

export type Stats = {
  users: { total: number; newThisWeek: number };
  shops: { total: number; open: number };
  products: { total: number; outOfStock: number };
  messages: { total: number; today: number };
  conversations: { total: number };
  karma: { events: number };
  broadcasts: { active: number; total: number };
  invitations: { pending: number };
  categories: { total: number };
  messagesLast7Days: { date: string; count: number }[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type UserListItem = {
  id: string;
  clerkUserId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
};

export type UserDetail = {
  user: UserListItem;
  shopsOwned: { id: string; name: string; marketName: string | null; isOpen: boolean }[];
  memberships: { shopId: string; role: string }[];
  conversationsCount: number;
  karma: {
    total: number;
    recent: {
      id: string;
      kind: string;
      points: number;
      note: string | null;
      createdAt: string;
    }[];
  };
};

export type ShopListItem = {
  id: string;
  name: string;
  marketName: string | null;
  stallInfo: string | null;
  isOpen: boolean;
  location: { type: "Point"; coordinates: [number, number] };
  createdAt: string;
  seller: { id: string; name: string | null; email: string | null } | null;
};

export type ShopDetail = {
  shop: ShopListItem;
  members: {
    id: string;
    userId: string;
    role: string;
    name: string | null;
    email: string | null;
  }[];
  productsCount: number;
  conversationsCount: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  quantity: number;
  stockStatus: "in_stock" | "out_of_stock";
  photos: string[];
  shop: { id: string; name: string };
  deletedAt: string | null;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent: string | null;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  shop: { id: string; name: string; marketName: string | null } | null;
  customer: { id: string; name: string | null; email: string | null } | null;
  lastMessageAt: string | null;
  lastMessageText: string;
  lastMessageSenderRole: "customer" | "seller" | null;
  customerUnreadCount: number;
  sellerUnreadCount: number;
};

export type ConversationMessage = {
  id: string;
  senderUserId: string;
  senderRole: "customer" | "seller";
  text: string;
  createdAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: "seller" | "sub_seller";
  shop: { id: string; name: string };
  acceptedAt: string | null;
  createdAt: string;
};

export type Broadcast = {
  id: string;
  userId: string | null;
  query: string;
  status: "active" | "found" | "expired";
  location: { type: "Point"; coordinates: [number, number] };
  createdAt: string;
};

export type KarmaEvent = {
  id: string;
  user: { id: string; name: string | null; email: string | null } | null;
  kind: string;
  points: number;
  note: string | null;
  createdAt: string;
};

export type AdminShopReview = {
  id: string;
  shopId: string;
  shopName: string | null;
  shopMarketName: string | null;
  customerUserId: string;
  customerName: string | null;
  customerEmail: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewsResponse = {
  reviews: AdminShopReview[];
  page: number;
  pageSize: number;
  total: number;
};
