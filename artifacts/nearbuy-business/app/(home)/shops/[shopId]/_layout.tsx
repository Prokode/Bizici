import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getGetShopQueryOptions } from "@workspace/api-client-react";

export default function ShopLayout() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-product"
        options={{ headerShown: true, presentation: "modal", title: "Add Product" }}
      />
      <Stack.Screen name="camera" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen
        name="edit"
        options={{ headerShown: true, presentation: "modal", title: shop?.name ?? "Edit shop" }}
      />
    </Stack>
  );
}
