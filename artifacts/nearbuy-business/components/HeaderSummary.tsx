import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";
import { getGetShopSummaryQueryOptions } from "@workspace/api-client-react";

export function HeaderSummary({ shopId }: { shopId: string }) {
  const colors = useColors();
  const { data, isLoading } = useQuery({
    ...getGetShopSummaryQueryOptions(shopId),
    enabled: !!shopId,
  });

  if (isLoading || !data) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
      <Text style={[styles.text, { color: colors.foreground, fontFamily: "PlusJakartaSans_500Medium" }]}>
        {data.totalProducts} Products • {data.inStockCount} In Stock • {data.activeRequestsCount} Requests
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12 },
});
