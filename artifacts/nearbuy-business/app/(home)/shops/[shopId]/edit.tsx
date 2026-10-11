import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { router, useLocalSearchParams } from "expo-router";
import { ShopMapPicker } from "@/components/ShopMapPicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useUpdateShop,
  getGetShopQueryOptions,
  getGetShopQueryKey,
  getListShopsQueryKey,
  getListShopsQueryOptions,
  type ShopUpdateInputKind,
  type ShopFulfillment,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTranslation } from "react-i18next";
import { ShopKindSelector } from "@/components/ShopKindSelector";
import { ShopFulfillmentSelector } from "@/components/ShopFulfillmentSelector";

export default function EditShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { shopId, section } = useLocalSearchParams<{ shopId: string; section?: string }>();

  const shopQuery = useQuery({
    ...getGetShopQueryOptions(shopId as string, { request: { timeoutMs: 15_000 } }),
    enabled: !!shopId,
    retry: false,
  });
  const { data: shop } = shopQuery;
  const rolesQuery = useQuery({ ...getListShopsQueryOptions({ request: { timeoutMs: 15_000 } }), retry: false });
  const isSeller = rolesQuery.data?.find((entry) => entry.shop.id === shopId)?.role === "seller";

  const [step, setStep] = useState(section === "location" ? 2 : 1);
  const [name, setName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [stallInfo, setStallInfo] = useState("");
  const [kind, setKind] = useState<ShopUpdateInputKind>("products");
  const [fulfillment, setFulfillment] = useState<ShopFulfillment>("pickup_only");
  const [deliveryRadiusStr, setDeliveryRadiusStr] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateShop = useUpdateShop();

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setMarketName(shop.marketName ?? "");
      setStallInfo(shop.stallInfo ?? "");
      setKind(shop.kind ?? "products");
      setFulfillment(shop.fulfillment ?? "pickup_only");
      setDeliveryRadiusStr(
        shop.deliveryRadiusKm != null ? String(shop.deliveryRadiusKm) : "",
      );
      setLocation({ latitude: shop.latitude, longitude: shop.longitude });
    }
  }, [shop]);

  const handleSave = () => {
    if (!location || !shopId || !isSeller || updateShop.isPending) return;
    setError(null);
    updateShop.mutate(
      {
        shopId: shopId as string,
        data: {
          name: name.trim(),
          marketName: marketName || null,
          stallInfo: stallInfo || null,
          latitude: location.latitude,
          longitude: location.longitude,
          kind,
          fulfillment,
          deliveryRadiusKm: deliveryRadiusStr.trim()
            ? parseInt(deliveryRadiusStr, 10)
            : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetShopQueryKey(shopId as string) });
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          router.back();
        },
        onError: (err: any) => {
          setError(err?.message ?? t("editShop.updateError"));
        },
      }
    );
  };

  if (shopQuery.isLoading || rolesQuery.isLoading) return <View style={[styles.state, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.foreground }}>{t("common.loading")}</Text></View>;
  if (!shop || shopQuery.isError || rolesQuery.isError) return <View style={[styles.state, { backgroundColor: colors.background }]}><Text style={{ color: colors.foreground }}>{t("shopConfiguration.loadError")}</Text><Button title={t("common.retry")} onPress={() => { void shopQuery.refetch(); void rolesQuery.refetch(); }} /><Button title={t("common.back")} variant="ghost" onPress={() => router.back()} /></View>;
  if (!isSeller) return <View style={[styles.state, { backgroundColor: colors.background }]}><Text style={{ color: colors.foreground }}>{t("shopConfiguration.readOnly")}</Text><Button title={t("common.back")} onPress={() => router.back()} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 1 ? (
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
          <Input label={t("editShop.name")} value={name} onChangeText={setName} />
          <Input label={t("editShop.marketName")} value={marketName} onChangeText={setMarketName} />
          <Input label={t("editShop.stallInfo")} value={stallInfo} onChangeText={setStallInfo} />
          <ShopKindSelector value={kind} onChange={setKind} />
          {kind !== "services" ? (
            <>
              <ShopFulfillmentSelector
                value={fulfillment}
                onChange={setFulfillment}
                hint={t("fulfillment.shopHint")}
              />
              {fulfillment !== "pickup_only" ? (
                <Input
                  label={t("fulfillment.deliveryRadiusKm")}
                  placeholder={t("fulfillment.deliveryRadiusPlaceholder")}
                  value={deliveryRadiusStr}
                  onChangeText={setDeliveryRadiusStr}
                  keyboardType="number-pad"
                />
              ) : null}
            </>
          ) : null}

          {error && <Text style={{ color: colors.destructive, marginTop: 8 }}>{error}</Text>}

          <View style={{ flex: 1 }} />

          <Button title={t("editShop.updateLocation")} variant="secondary" onPress={() => setStep(2)} style={{ marginTop: 24 }} />
          <Button title={t("editShop.save")} size="lg" disabled={!name.trim() || updateShop.isPending} loading={updateShop.isPending} onPress={handleSave} style={{ marginTop: 8 }} />
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={styles.mapContainer}>
          {location && <ShopMapPicker latitude={location.latitude} longitude={location.longitude} onChange={setLocation} />}
          <View style={[styles.mapOverlay, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Card style={[styles.mapCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.mapTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                {t("editShop.pinTitle")}
              </Text>
              <Button title={t("editShop.done")} size="lg" onPress={() => setStep(1)} />
            </Card>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },
  mapContainer: { flex: 1 },
  mapOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 },
  mapCard: { padding: 16, borderRadius: 16 },
  mapTitle: { fontSize: 20, marginBottom: 12 },
});
