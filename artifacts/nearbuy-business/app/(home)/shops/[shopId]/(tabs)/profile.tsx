import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Platform, Modal, Switch } from "react-native";
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
import { useAuth, useClerk } from "@clerk/expo";
import { HelpersSection } from "@/components/HelpersSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const clerk = useClerk();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const { data: shops } = useQuery(getListShopsQueryOptions());
  const myRole = shops?.find((s) => s.shop.id === shopId)?.role;
  const isSeller = myRole === "seller";

  const { data: qrData } = useQuery({
    ...getGetShopQrQueryOptions(shopId as string),
    enabled: !!shopId && !!shop,
  });

  const setShopOpen = useSetShopOpen();
  const [showQr, setShowQr] = useState(false);

  const handleSignOut = async () => {
    await clerk.signOut();
    queryClient.clear();
    router.replace("/(auth)/sign-in");
  };

  if (!shop || !shopId) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
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
            {shop.marketName || "No Market Name"}
          </Text>
          <Badge variant={isSeller ? "default" : "secondary"} style={{ marginTop: 6, alignSelf: "flex-start" }}>
            {isSeller ? "Seller" : "Helper"}
          </Badge>
        </View>
      </View>

      <View style={styles.actions}>
        {isSeller && (
          <Button
            title="Edit Details"
            variant="secondary"
            icon={<Feather name="edit-2" size={18} color={colors.secondaryForeground} />}
            style={styles.actionBtn}
            onPress={() => router.push(`/(home)/shops/${shopId}/edit`)}
          />
        )}
        <Button
          title="Show QR Code"
          variant="primary"
          icon={<Feather name="maximize" size={18} color={colors.primaryForeground} />}
          style={styles.actionBtn}
          onPress={() => setShowQr(true)}
        />
      </View>

      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            Shop Open
          </Text>
          <Switch
            value={shop.isOpen}
            disabled={!isSeller}
            onValueChange={(val) => {
              setShopOpen.mutate(
                { shopId: shopId as string, data: { isOpen: val } },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetShopQueryKey(shopId as string) });
                    queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
                  },
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
            Stall Info
          </Text>
          <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {shop.stallInfo || "Not specified"}
          </Text>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
        Location
      </Text>

      <View style={[styles.mapContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
        <ShopMapPreview latitude={shop.latitude} longitude={shop.longitude} />
      </View>

      {isSeller && <HelpersSection shopId={shopId as string} />}

      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <LanguageSwitcher />
      </View>

      <View style={{ marginTop: 8 }}>
        <Button
          title="Switch shop"
          variant="ghost"
          icon={<Feather name="repeat" size={18} color={colors.foreground} />}
          onPress={() => router.replace("/(home)")}
        />
        <Button
          title="Sign out"
          variant="ghost"
          icon={<Feather name="log-out" size={18} color={colors.destructive} />}
          textStyle={{ color: colors.destructive }}
          onPress={handleSignOut}
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
              Scan to view shop
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
            ) : (
              <Text style={{ color: colors.foreground }}>Loading QR code...</Text>
            )}

            <Text style={[styles.qrDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Customers can scan this code to see your digital catalog.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
