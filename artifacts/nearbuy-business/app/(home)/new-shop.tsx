import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { router } from "expo-router";
import { ShopMapPicker } from "@/components/ShopMapPicker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateShop, getListShopsQueryKey, getGetMeQueryKey, type ShopCreateInputKind } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Feather } from "@expo/vector-icons";
import { ShopKindSelector } from "@/components/ShopKindSelector";

export default function NewShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [stallInfo, setStallInfo] = useState("");
  const [kind, setKind] = useState<ShopCreateInputKind>("products");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShop = useCreateShop();

  useEffect(() => {
    if (step === 2 && !location) {
      (async () => {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocation({ latitude: 37.7749, longitude: -122.4194 });
          setLocationLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setLocationLoading(false);
      })();
    }
  }, [step, location]);

  const handleSave = () => {
    if (!location) return;
    setError(null);
    createShop.mutate(
      {
        data: {
          name,
          marketName: marketName || null,
          stallInfo: stallInfo || null,
          latitude: location.latitude,
          longitude: location.longitude,
          kind,
        },
      },
      {
        onSuccess: (newShop) => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          router.replace(`/(home)/shops/${newShop.id}`);
        },
        onError: (err: any) => {
          setError(err?.message ?? t("newShop.createError"));
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Button
          variant="ghost"
          icon={<Feather name="x" size={24} color={colors.foreground} />}
          onPress={() => router.back()}
        />
      </View>

      {step === 1 ? (
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {t("newShop.step1Title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            {t("newShop.step1Subtitle")}
          </Text>

          <Input label={t("newShop.shopName")} placeholder={t("newShop.shopNamePlaceholder")} value={name} onChangeText={setName} />
          <Input label={t("newShop.marketName")} placeholder={t("newShop.marketNamePlaceholder")} value={marketName} onChangeText={setMarketName} />
          <Input label={t("newShop.stallInfo")} placeholder={t("newShop.stallInfoPlaceholder")} value={stallInfo} onChangeText={setStallInfo} />
          <ShopKindSelector value={kind} onChange={setKind} />

          <View style={{ flex: 1 }} />

          <Button
            title={t("newShop.next")}
            size="lg"
            disabled={!name.trim()}
            onPress={() => setStep(2)}
            style={{ marginTop: 24 }}
          />
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={styles.mapContainer}>
          {location && <ShopMapPicker latitude={location.latitude} longitude={location.longitude} onChange={setLocation} />}

          <View style={[styles.mapOverlay, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Card style={[styles.mapCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.mapTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                {t("newShop.step2Title")}
              </Text>
              <Text style={[styles.mapDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                {t("newShop.step2Subtitle")}
              </Text>
              {error && (
                <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 13 }}>{error}</Text>
              )}
              <Button
                title={t("newShop.create")}
                size="lg"
                loading={createShop.isPending || locationLoading}
                disabled={!location || createShop.isPending}
                onPress={handleSave}
              />
              <Button title={t("newShop.back")} variant="ghost" onPress={() => setStep(1)} style={{ marginTop: 8 }} />
            </Card>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 4 },
  content: { padding: 24, flexGrow: 1 },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  mapContainer: { flex: 1 },
  mapOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 },
  mapCard: { padding: 16, borderRadius: 16 },
  mapTitle: { fontSize: 20, marginBottom: 4 },
  mapDesc: { fontSize: 14, marginBottom: 16 },
});
