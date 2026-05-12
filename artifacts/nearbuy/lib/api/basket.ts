/**
 * Auth-required basket endpoints (`/api/me/basket`). The basket is the list
 * of product queries a customer wants to find on a "shopping run" (course).
 * The actual route-planning lives in `./course.ts`.
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
