import React from "react";
import { StyleSheet, Text, View, FlatList, RefreshControl, TouchableOpacity, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";
import {
  getListShopsQueryOptions,
  getListMyInvitationsQueryOptions,
  type ShopWithRole,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function ShopListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    data: shops,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery(getListShopsQueryOptions());

  const { data: invitations } = useQuery(getListMyInvitationsQueryOptions());

  const renderItem = ({ item }: { item: ShopWithRole }) => {
    const shop = item.shop;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/(home)/shops/${shop?.id}`);
        }}
      >
        <Card style={styles.shopCard}>
          <View style={styles.shopHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                {shop?.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.shopInfo}>
              <Text style={[styles.shopName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                {shop?.name}
              </Text>
              <Text style={[styles.shopMeta, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
                {shop?.marketName || t("shopList.noMarketName")}
              </Text>
            </View>
            <View style={styles.badges}>
              <Badge variant={item.role === "seller" ? "default" : "secondary"}>
                {item.role === "seller" ? t("shopList.seller") : t("shopList.helper")}
              </Badge>
              {shop?.isOpen ? (
                <Badge variant="success" style={{ marginTop: 4 }}>{t("shopList.open")}</Badge>
              ) : (
                <Badge variant="destructive" style={{ marginTop: 4 }}>{t("shopList.closed")}</Badge>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const inviteCount = invitations?.length ?? 0;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Skeleton height={88} style={{ marginBottom: 12 }} />
          <Skeleton height={88} style={{ marginBottom: 12 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {(shops || []).length > 0 ? <FlatList
        data={shops || []}
        keyExtractor={(item) => item?.shop?.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={
          inviteCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(home)/invitations")}
              style={[styles.inviteBanner, { backgroundColor: colors.accent, borderRadius: colors.radius }]}
            >
              <Feather name="mail" size={20} color={colors.accentForeground} />
              <Text style={[styles.inviteText, { color: colors.accentForeground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                {t("shopList.invitations", { count: inviteCount })}
              </Text>
              <Feather name="chevron-right" size={20} color={colors.accentForeground} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="shopping-bag" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {t("shopList.noShopsTitle")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              {t("shopList.noShopsHint")}
            </Text>
            <Button
              title={t("shopList.createFirst")}
              onPress={() => router.push("/(home)/new-shop")}
              style={{ marginTop: 24 }}
            />
          </View>
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      /> : (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
        </View> )}

      {(shops?.length ?? 0) > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(home)/new-shop");
          }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {t("shopList.newShop")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  inviteBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  inviteText: { flex: 1, fontSize: 14 },
  shopCard: { padding: 16, marginBottom: 12 },
  shopHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { fontSize: 22 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 18, marginBottom: 2 },
  shopMeta: { fontSize: 13 },
  badges: { alignItems: "flex-end" },
  emptyContainer: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, marginBottom: 8, textAlign: "center" },
  emptyDesc: { fontSize: 16, textAlign: "center", lineHeight: 22 },
  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    gap: 8,
  },
  fabText: { fontSize: 15 },
});
