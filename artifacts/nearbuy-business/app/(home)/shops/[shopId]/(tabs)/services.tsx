import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";
import {
  getListShopServicesQueryOptions,
  getGetShopQueryOptions,
  type Service,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function pricingLabel(
  service: Service,
  t: (k: string, opts?: any) => string,
): string {
  switch (service.pricingType) {
    case "fixed":
      return service.price != null
        ? `${(service.price / 100).toFixed(2)} €`
        : t("services.pricingFixed");
    case "hourly":
      return service.price != null
        ? `${(service.price / 100).toFixed(2)} €/h`
        : t("services.pricingHourly");
    case "quote":
      return t("services.pricingQuote");
    default:
      return "";
  }
}

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const {
    data: services,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    ...getListShopServicesQueryOptions(shopId as string),
    enabled: !!shopId && shop?.kind !== "products",
  });

  // Shop is products-only — surface a friendly conversion prompt instead of an
  // empty list. The convert action just routes to the edit screen where the
  // owner can flip the kind to "hybrid" or "services".
  if (shop && shop.kind === "products") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <Card style={[styles.promptCard, { backgroundColor: colors.card }]}>
          <Feather name="briefcase" size={32} color={colors.primary} />
          <Text
            style={[
              styles.promptTitle,
              {
                color: colors.foreground,
                fontFamily: "PlusJakartaSans_700Bold",
              },
            ]}
          >
            {t("services.convertPromptTitle")}
          </Text>
          <Text
            style={[
              styles.promptBody,
              {
                color: colors.mutedForeground,
                fontFamily: "PlusJakartaSans_400Regular",
              },
            ]}
          >
            {t("services.convertPromptBody")}
          </Text>
          <Button
            title={t("services.convertPromptCta")}
            onPress={() => router.push(`/(home)/shops/${shopId}/edit`)}
            style={{ marginTop: 12 }}
          />
        </Card>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Service }) => {
    const categoryLabel =
      item.categories && item.categories.length > 0
        ? item.categories.map((c) => c.name).join(", ")
        : "";
    return (
      <TouchableOpacity
        onPress={() =>
          router.push(
            `/(home)/shops/${shopId}/edit-service?serviceId=${item.id}`,
          )
        }
        activeOpacity={0.85}
      >
        <Card style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.foreground,
                    fontFamily: "PlusJakartaSans_700Bold",
                  },
                ]}
              >
                {item.title}
              </Text>
              {categoryLabel ? (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "PlusJakartaSans_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {categoryLabel}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text
                  style={[
                    styles.price,
                    {
                      color: colors.foreground,
                      fontFamily: "PlusJakartaSans_600SemiBold",
                    },
                  ]}
                >
                  {pricingLabel(item, t)}
                </Text>
                {item.durationMinutes ? (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "PlusJakartaSans_500Medium",
                      fontSize: 13,
                    }}
                  >
                    · {t("services.duration", { minutes: item.durationMinutes })}
                  </Text>
                ) : null}
              </View>
            </View>
            <Badge variant={item.isActive ? "default" : "secondary"}>
              {item.isActive ? t("services.active") : t("services.inactive")}
            </Badge>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerActions,
          { paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 },
        ]}
      >
        <Button
          title={t("providerProfile.screenTitle")}
          variant="ghost"
          icon={<Feather name="user" size={18} color={colors.primary} />}
          onPress={() =>
            router.push(`/(home)/shops/${shopId}/provider-profile`)
          }
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button
          title={t("services.addCta")}
          icon={<Feather name="plus" size={18} color={colors.primaryForeground} />}
          onPress={() => router.push(`/(home)/shops/${shopId}/add-service`)}
          style={{ flex: 1 }}
        />
      </View>

      <FlatList
        data={services ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 96 + insets.bottom,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Feather
                name="inbox"
                size={48}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colors.foreground,
                    fontFamily: "PlusJakartaSans_700Bold",
                  },
                ]}
              >
                {t("services.empty")}
              </Text>
              <Text
                style={[
                  styles.emptyHint,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "PlusJakartaSans_400Regular",
                  },
                ]}
              >
                {t("services.emptyHint")}
              </Text>
              <Button
                title={t("services.addFirst")}
                onPress={() =>
                  router.push(`/(home)/shops/${shopId}/add-service`)
                }
                style={{ marginTop: 16 }}
              />
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: "row" },
  card: { padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  price: { fontSize: 14 },
  empty: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, marginTop: 16 },
  emptyHint: { fontSize: 14, marginTop: 6, textAlign: "center" },
  promptCard: {
    padding: 24,
    margin: 24,
    borderRadius: 16,
    alignItems: "flex-start",
  },
  promptTitle: { fontSize: 20, marginTop: 12, marginBottom: 6 },
  promptBody: { fontSize: 14, lineHeight: 20 },
});
