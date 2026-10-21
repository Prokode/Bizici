import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getGetShopQueryOptions } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShopId } from "@/hooks/useShopId";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";

/** Fail closed until the selected shop is known, including direct form links. */
export function ServiceAccessGate({ children }: { children: React.ReactNode }) {
  const shopId = useShopId();
  const colors = useColors();
  const { t } = useTranslation();
  const { data: shop, isPending, isError, refetch } = useQuery({
    ...getGetShopQueryOptions(shopId ?? ""),
    enabled: !!shopId,
    refetchOnMount: "always",
  });

  if (shopId && isPending) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>;
  }
  if (!shopId || isError || !shop) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.foreground }}>{t("services.shopLoadFailed")}</Text>
      {shopId && <Button title={t("common.retry")} onPress={() => { if (shopId) void refetch(); }} />}
    </View>;
  }
  if (shop.kind === "products") {
    return <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{t("services.convertPromptTitle")}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{t("services.convertPromptBody")}</Text>
      <Button title={t("services.addCta")} disabled onPress={() => {}} />
      <Button title={t("services.convertPromptCta")}
        onPress={() => router.push(`/(home)/shops/${shopId}/edit`)} />
    </View>;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  body: { fontSize: 15, lineHeight: 22, fontFamily: "PlusJakartaSans_400Regular" },
});
