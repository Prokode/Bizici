/**
 * Typed wrapper around the auth-required course/basket endpoints of the
 * NearBuy api-server. Uses `customFetch` so it inherits the base URL +
 * Clerk Bearer-token getter registered in the root layout.
 */
import { customFetch } from "@workspace/api-client-react";

export type BasketItem = {
  id: string;
  query: string;
  addedAt: string;
};

export type Basket = {
  items: BasketItem[];
};

export type CourseStopShop = {
  id: string;
  name: string;
  marketName: string | null;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  distanceMeters: number;
};

export type CourseStopProduct = {
  id: string;
  name: string;
  price: number;
  photo: string | null;
};

export type CourseStop = {
  itemId: string;
  query: string;
  nearestShop: CourseStopShop | null;
  products: CourseStopProduct[];
};

export type CoursePlan = {
  stops: CourseStop[];
};

export async function fetchBasket(): Promise<Basket> {
  return customFetch<Basket>("/api/me/basket", { method: "GET" });
}

export async function addBasketItem(query: string): Promise<Basket> {
  return customFetch<Basket>("/api/me/basket/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export async function removeBasketItem(itemId: string): Promise<void> {
  await customFetch<void>(
    `/api/me/basket/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
}

export async function clearBasket(): Promise<void> {
  await customFetch<void>("/api/me/basket/clear", { method: "POST" });
}

export async function startCourse(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
}): Promise<CoursePlan> {
  return customFetch<CoursePlan>("/api/me/basket/start-course", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}
