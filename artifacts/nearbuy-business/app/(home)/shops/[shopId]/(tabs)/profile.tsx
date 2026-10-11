import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Platform, Modal, Switch, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetShopQueryOptions,
  getGetShopQueryKey,
  getListShopsQueryKey,
  getGetShopQrQueryOptions,
  getListShopsQueryOptions,
  useSetShopOpen,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ShopMapPreview } from "@/components/ShopMapPreview";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HelpersSection } from "@/components/HelpersSection";
import { useTranslation } from "react-i18next";

export default function ShopConfigurationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const shopQuery = useQuery({
    ...getGetShopQueryOptions(shopId as string, { request: { timeoutMs: 15_000 } }),
    enabled: !!shopId,
    retry: false,
  });
  const { data: shop } = shopQuery;

  const rolesQuery = useQuery({
    ...getListShopsQueryOptions({ request: { timeoutMs: 15_000 } }),
    retry: false,
  });
  const shops = rolesQuery.data;
  const myRole = shops?.find((s) => s.shop.id === shopId)?.role;
  const isSeller = myRole === "seller";
  const [showQr, setShowQr] = useState(false);

  const qrQuery = useQuery({
    ...getGetShopQrQueryOptions(shopId as string),
    enabled: !!shopId && !!shop && showQr,
  });
  const qrData = qrQuery.data;

  const setShopOpen = useSetShopOpen();
  const [statusError, setStatusError] = useState(false);

  if (shopQuery.isLoading || rolesQuery.isLoading) {
    return <View style={[styles.state, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.foreground }}>{t("common.loading")}</Text></View>;
  }
  if (!shop || !shopId || shopQuery.isError || rolesQuery.isError || !myRole) {
    return <View style={[styles.state, { backgroundColor: colors.background }]}><Text style={{ color: colors.foreground, textAlign: "center" }}>{t("shopConfiguration.loadError")}</Text><Button title={t("common.retry")} loading={shopQuery.isFetching || rolesQuery.isFetching} onPress={() => { void shopQuery.refetch(); void rolesQuery.refetch(); }} /><Button title={t("profile.switchShop")} variant="ghost" onPress={() => router.replace("/(home)")} /></View>;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content, { paddingBottom: insets.bottom + 100 },
        Platform.OS === "web" && { paddingTop: 67 + 16, paddingBottom: 84 + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {shop.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.shopName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {shop.name}
          </Text>
          <Text style={[styles.shopCategory, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
            {shop.marketName || t("profile.noMarketName")}
          </Text>
          <Badge variant={isSeller ? "default" : "secondary"} style={{ marginTop: 6, alignSelf: "flex-start" }}>
            {isSeller ? t("profile.seller") : t("profile.helper")}
          </Badge>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("shopConfiguration.title")}</Text>

      <View style={styles.actions}>
        {isSeller && (
          <Button
            title={t("profile.editDetails")}
            variant="secondary"
            icon={<Feather name="edit-2" size={18} color={colors.secondaryForeground} />}
            style={styles.actionBtn}
            onPress={() => router.push(`/(home)/shops/${shopId}/edit`)}
          />
        )}
        <Button
          title={t("profile.showQr")}
          variant="primary"
          icon={<Feather name="maximize" size={18} color={colors.primaryForeground} />}
          style={styles.actionBtn}
          onPress={() => setShowQr(true)}
        />
      </View>

      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {t("profile.shopOpen")}
          </Text>
          <Switch
            value={shop.isOpen}
            disabled={!isSeller || setShopOpen.isPending}
            onValueChange={(val) => {
              setStatusError(false);
              setShopOpen.mutate(
                { shopId: shopId as string, data: { isOpen: val } },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetShopQueryKey(shopId as string) });
                    queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
                  },
                  onError: () => setStatusError(true),
                }
              );
            }}
            trackColor={{ false: colors.muted, true: colors.success || colors.primary }}
            thumbColor={colors.background}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
            {t("profile.stallInfo")}
          </Text>
          <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {shop.stallInfo || t("profile.notSpecified")}
          </Text>
        </View>
      </Card>
      {statusError && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{t("common.error")}</Text>}

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
        {t("profile.location")}
      </Text>

      <View style={[styles.mapContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
        <ShopMapPreview key={`${shop.latitude}:${shop.longitude}`} latitude={shop.latitude} longitude={shop.longitude} />
      </View>
      {isSeller && <Button title={t("editShop.updateLocation")} variant="secondary" onPress={() => router.push({ pathname: "/shops/[shopId]/edit", params: { shopId, section: "location" } })} />}

      {isSeller && <HelpersSection shopId={shopId as string} />}

      <View style={{ marginTop: 8 }}>
        <Button
          title={t("profile.switchShop")}
          variant="ghost"
          icon={<Feather name="repeat" size={18} color={colors.foreground} />}
          onPress={() => router.replace("/(home)")}
          style={{ marginTop: 4 }}
        />
      </View>

      <Modal visible={showQr} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowQr(false)}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background, paddingTop: Platform.OS === "ios" ? 0 : insets.top },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {t("profile.qrTitle")}
            </Text>
            <Button
              variant="ghost"
              icon={<Feather name="x" size={24} color={colors.foreground} />}
              onPress={() => setShowQr(false)}
            />
          </View>

          <View style={styles.qrWrapper}>
            {qrData ? (
              <View style={[styles.qrContainer, { backgroundColor: "#fff" }]}>
                <QRCode value={qrData.url} size={250} color="#000" backgroundColor="#fff" />
              </View>
            ) : qrQuery.isError ? (
              <Button title={t("common.retry")} onPress={() => void qrQuery.refetch()} />
            ) : (
              <Text style={{ color: colors.foreground }}>{t("profile.qrLoading")}</Text>
            )}

            <Text style={[styles.qrDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              {t("profile.qrDesc")}
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  container: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 16 },
  avatarText: { fontSize: 28 },
  headerInfo: { flex: 1 },
  shopName: { fontSize: 24, marginBottom: 4 },
  shopCategory: { fontSize: 16 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1 },
  detailsCard: { marginBottom: 24 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  detailLabel: { fontSize: 16 },
  detailValue: { fontSize: 16 },
  divider: { height: 1, marginHorizontal: 16 },
  sectionTitle: { fontSize: 20, marginBottom: 12, marginTop: 8 },
  mapContainer: { height: 200, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  modalTitle: { fontSize: 20 },
  qrWrapper: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  qrContainer: { padding: 24, borderRadius: 16, marginBottom: 32 },
  qrDesc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
});
