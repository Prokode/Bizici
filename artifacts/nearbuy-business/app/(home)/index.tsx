import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  getListMyInvitationsQueryOptions,
  getListShopsQueryOptions,
  type ShopWithRole,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const SHOP_LIST_REQUEST_TIMEOUT_MS = 15_000;

export default function ShopListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const shopsQuery = useQuery({
    ...getListShopsQueryOptions({ request: { timeoutMs: SHOP_LIST_REQUEST_TIMEOUT_MS } }),
    retry: false,
  });
  const invitationsQuery = useQuery({
    ...getListMyInvitationsQueryOptions({ request: { timeoutMs: SHOP_LIST_REQUEST_TIMEOUT_MS } }),
    retry: false,
  });
  const { data: shops, isLoading, isError, isRefetching, refetch } = shopsQuery;
  const { data: invitations, isError: invitationsError } = invitationsQuery;
  const inviteCount = invitations?.length ?? 0;
  const retryQueries = () => void Promise.all([refetch(), invitationsQuery.refetch()]);

  const openNewShop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(home)/new-shop");
  };

  const renderItem = ({ item }: { item: ShopWithRole }) => {
    const shop = item.shop;
    const isSeller = item.role === "seller";
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
          Haptics.selectionAsync();
          if (shop?.id) router.push({ pathname: "/shops/[shopId]", params: { shopId: shop.id } });
        }}
        testID={`shop-card-${shop.id}`}
      >
        <Card style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.shopMark, { backgroundColor: isSeller ? colors.primary : colors.secondary }]}>
            <Text style={[styles.shopInitial, { color: isSeller ? colors.primaryForeground : colors.secondaryForeground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {shop?.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.shopMain}>
            <Text numberOfLines={1} style={[styles.shopName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {shop?.name}
            </Text>
            <Text numberOfLines={1} style={[styles.market, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
              {shop?.marketName || t("shopList.noMarketName")}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.rolePill, { backgroundColor: colors.accent }]}>
                <Text style={[styles.roleText, { color: colors.accentForeground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                  {isSeller ? t("shopList.seller") : t("shopList.helper")}
                </Text>
              </View>
              <View style={styles.status}>
                <View style={[styles.statusDot, { backgroundColor: shop?.isOpen ? colors.success : colors.mutedForeground }]} />
                <Text style={[styles.statusText, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
                  {shop?.isOpen ? t("shopList.open") : t("shopList.closed")}
                </Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}><View style={styles.content}><Skeleton height={110} style={styles.skeleton} /><Skeleton height={110} style={styles.skeleton} /></View></View>;
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={42} color={colors.destructive} />
        <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.loadErrorTitle")}</Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>{t("shopList.loadErrorHint")}</Text>
        <Button title={t("common.retry")} onPress={retryQueries} loading={isRefetching} testID="shop-list-retry" style={styles.retry} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={shops ?? []}
        keyExtractor={(item) => item.shop.id}
        renderItem={renderItem}
        scrollEnabled
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={retryQueries} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.eyebrow")}</Text>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.heading")}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>{t("shopList.subtitle")}</Text>
              </View>
              <View style={[styles.brandMark, { backgroundColor: colors.secondary }]}><Text style={[styles.brandText, { color: colors.secondaryForeground, fontFamily: "PlusJakartaSans_700Bold" }]}>Bi</Text></View>
            </View>
            {inviteCount > 0 ? (
              <TouchableOpacity activeOpacity={0.86} onPress={() => router.push("/(home)/invitations")} style={[styles.inviteCard, { backgroundColor: colors.accent, borderColor: colors.primary }]} testID="shop-list-invitations">
                <View style={[styles.inviteIcon, { backgroundColor: colors.primary }]}><Feather name="mail" size={18} color={colors.primaryForeground} /></View>
                <View style={styles.inviteCopy}><Text style={[styles.inviteTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.invitationTitle")}</Text><Text style={[styles.inviteDetail, { color: colors.accentForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>{t("shopList.invitations", { count: inviteCount })}</Text></View>
                <Feather name="chevron-right" size={20} color={colors.accentForeground} />
              </TouchableOpacity>
            ) : null}
            {invitationsError ? <View style={[styles.secondaryError, { borderColor: colors.border, backgroundColor: colors.muted }]}><Text style={[styles.secondaryErrorText, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>{t("shopList.invitationsLoadError")}</Text><Button title={t("common.retry")} variant="ghost" size="sm" onPress={() => void invitationsQuery.refetch()} /></View> : null}
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.myShops")}</Text><TouchableOpacity onPress={openNewShop} testID="shop-list-add"><Text style={[styles.addText, { color: colors.primary, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.add")}</Text></TouchableOpacity></View>
          </View>
        }
        ListEmptyComponent={<View style={styles.emptyContainer}><Feather name="shopping-bag" size={42} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.noShopsTitle")}</Text><Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>{t("shopList.noShopsHint")}</Text><Button title={t("shopList.createFirst")} onPress={openNewShop} testID="shop-list-create" style={styles.retry} /></View>}
      />
      {(shops?.length ?? 0) > 0 ? <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.primary, bottom: insets.bottom + 18 }]} onPress={openNewShop} activeOpacity={0.86} testID="shop-list-create-floating"><Feather name="plus" size={19} color={colors.primaryForeground} /><Text style={[styles.createText, { color: colors.primaryForeground, fontFamily: "PlusJakartaSans_700Bold" }]}>{t("shopList.newShop")}</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  content: { paddingHorizontal: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  eyebrow: { fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 35, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 7 },
  brandMark: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 22 },
  inviteCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 26 },
  inviteIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11 },
  inviteCopy: { flex: 1 },
  inviteTitle: { fontSize: 14, marginBottom: 2 },
  inviteDetail: { fontSize: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20 },
  addText: { fontSize: 14 },
  shopCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 11 },
  shopMark: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 13 },
  shopInitial: { fontSize: 23 },
  shopMain: { flex: 1, minWidth: 0 },
  shopName: { fontSize: 16, marginBottom: 3 },
  market: { fontSize: 12, marginBottom: 9 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rolePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { fontSize: 10 },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11 },
  secondaryError: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  secondaryErrorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  emptyContainer: { alignItems: "center", paddingVertical: 54, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 21, marginTop: 14, marginBottom: 7, textAlign: "center" },
  emptyDesc: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  retry: { marginTop: 22 },
  skeleton: { marginBottom: 12 },
  createButton: { position: "absolute", right: 18, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, elevation: 7 },
  createText: { fontSize: 14 },
});