import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getGetShopQueryOptions } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

export default function ShopLayout() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-product"
        options={{ headerShown: true, presentation: "modal", title: t("addProduct.screenTitle") }}
      />
      <Stack.Screen name="camera" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen
        name="edit"
        options={{ headerShown: true, presentation: "modal", title: shop?.name ?? t("editShop.screenTitle") }}
      />
      <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false }} />
    </Stack>
  );
}
