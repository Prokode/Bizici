import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getGetShopQueryOptions } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { ShopIdContext } from "@/hooks/useShopId";
import { normalizeShopId } from "@/lib/shopRoute";

export default function ShopLayout() {
  const params = useLocalSearchParams<{ shopId?: string | string[] }>();
  const shopId = normalizeShopId(params.shopId);
  const { t } = useTranslation();
  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  return (
    <ShopIdContext.Provider value={shopId}>
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
      <Stack.Screen
        name="kyc-submit"
        options={{ headerShown: true, presentation: "modal", title: t("kyc.submit.headerTitle") }}
      />
    </Stack>
    </ShopIdContext.Provider>
  );
}
