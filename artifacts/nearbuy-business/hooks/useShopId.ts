import { createContext, useContext } from "react";
import { useLocalSearchParams } from "expo-router";
import { resolveShopId } from "@/lib/shopRoute";

// Nested tab routes replace Expo's local params instead of inheriting them.
// Keep the selected ID at the dynamic shop layout, scoped to that shop.
export const ShopIdContext = createContext<string | undefined>(undefined);

export function useShopId() {
  const local = useLocalSearchParams<{ shopId?: string | string[] }>();
  return resolveShopId(local.shopId, useContext(ShopIdContext));
}
