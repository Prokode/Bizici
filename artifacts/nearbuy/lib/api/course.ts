/**
 * Shopping-run / "course" planning. Takes the user's basket items + their
 * current location, and returns an ordered list of nearest-shop stops with
 * candidate products for each query. See `./basket.ts` for basket CRUD.
 */
import { customFetch } from "@workspace/api-client-react";

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
