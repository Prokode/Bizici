import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { fetchVisualSearch, type VisualMatch } from "@/lib/api/visualSearch";
import { fetchShopDetail, type PublicShop } from "@/lib/api/shops";
import { ShopBottomSheet } from "@/components/ShopBottomSheet";

const FALLBACK = { lat: 48.8566, lng: 2.3522 };

function formatPriceCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}
function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

type Stage = "idle" | "captured" | "analyzing" | "results";

export default function CameraTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [matches, setMatches] = useState<VisualMatch[]>([]);
  const [openShop, setOpenShop] = useState<PublicShop | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    Platform.OS === "web" ? FALLBACK : null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolve the user's position once. Web: fallback already seeded; we still
  // try real geo and upgrade. Native: ask permission.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === "web") {
          if (typeof navigator === "undefined" || !navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!mounted) return;
              setCenter({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {},
            { timeout: 4000 },
          );
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) setCenter(FALLBACK);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        if (mounted) setCenter(FALLBACK);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Visual search mutation
  const visualSearchMutation = useMutation({
    mutationFn: async () => {
      if (!center) throw new Error(t("camera.positionUnavailable"));
      return fetchVisualSearch({
        lat: center.lat,
        lng: center.lng,
        imageBase64: photoBase64,
        hint: hint.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setMatches(data);
      setStage("results");
    },
    onError: () => {
      // Keep the photo so the user can retry
      setStage("captured");
    },
  });

  // -------- Capture sources --------

  const launchCamera = async () => {
    if (Platform.OS === "web") {
      // expo-image-picker on web uses a hidden file input. Easier to drive
      // our own input so we can also set capture="environment".
      fileInputRef.current?.click();
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t("camera.permTitle"),
          t("camera.permBody"),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("camera.permOpenGallery"), onPress: launchGallery },
          ],
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: true,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        setPhotoUri(a.uri);
        setPhotoBase64(a.base64 ?? null);
        setStage("captured");
      }
    } catch {
      Alert.alert(t("camera.errorLabel"), t("camera.openCameraError"));
    }
  };

  const launchGallery = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("camera.galleryUnavailable"),
        t("camera.galleryUnavailableBody"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhotoUri(a.uri);
      setPhotoBase64(a.base64 ?? null);
      setStage("captured");
    }
  };

  // Web file input handler
  const onWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPhotoUri(dataUrl);
      // Strip "data:image/jpeg;base64," prefix → keep only the base64 payload
      const comma = dataUrl.indexOf(",");
      setPhotoBase64(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
      setStage("captured");
    };
    reader.readAsDataURL(file);
    // Reset so picking the same file twice still fires onChange
    e.target.value = "";
  };

  const reset = () => {
    setStage("idle");
    setPhotoUri(null);
    setPhotoBase64(null);
    setHint("");
    setMatches([]);
    visualSearchMutation.reset();
  };

  const onAnalyze = () => {
    setStage("analyzing");
    visualSearchMutation.mutate();
  };

  const onPressMatch = (m: VisualMatch) => {
    const stub: PublicShop = {
      id: m.shopId,
      sellerId: "",
      name: m.shopName,
      marketName: m.shopMarketName,
      stallInfo: null,
      longitude: 0,
      latitude: 0,
      isOpen: m.shopIsOpen,
      ratingAvg: 0,
      ratingCount: 0,
      distanceMeters: m.distanceMeters,
      productCount: 0,
      previewProducts: [
        { id: m.id, name: m.name, price: m.price, photo: m.photo },
      ],
    };
    setOpenShop(stub);
  };

  // -------- Renderers per stage --------

  const renderIdle = () => (
    <View style={styles.idleWrap}>
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={["#A855F7", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCircle}
        >
          <Feather name="camera" size={64} color="#ffffff" />
        </LinearGradient>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("camera.title")}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {t("camera.subtitle")}
      </Text>

      <View style={{ height: 24 }} />

      <Button
        title={
          Platform.OS === "web"
            ? t("camera.uploadPhoto")
            : t("camera.takePhoto")
        }
        size="lg"
        fullWidth
        onPress={launchCamera}
        icon={<Feather name="camera" size={20} color="#ffffff" />}
      />
      {Platform.OS !== "web" && (
        <>
          <View style={{ height: 12 }} />
          <Button
            title={t("camera.pickGallery")}
            size="lg"
            variant="outline"
            fullWidth
            onPress={launchGallery}
            icon={<Feather name="image" size={20} color={colors.primary} />}
          />
        </>
      )}

      {Platform.OS === "web" && (
        // Hidden native file input — programmatic-only.
        // @ts-ignore — DOM-only props
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          // eslint-disable-next-line react/no-unknown-property
          capture="environment"
          onChange={onWebFileChange as any}
          style={{ display: "none" }}
        />
      )}
    </View>
  );

  const renderCaptured = (analyzing: boolean) => (
    <View style={styles.capturedWrap}>
      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImg} />
      )}
      <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>
        {t("camera.hintLabel")}
      </Text>
      <Text
        style={[styles.labelHelp, { color: colors.mutedForeground }]}
      >
        {t("camera.hintHelp")}
      </Text>
      <TextInput
        value={hint}
        onChangeText={setHint}
        placeholder={t("camera.hintPlaceholder")}
        placeholderTextColor={colors.mutedForeground}
        editable={!analyzing}
        style={[
          styles.hintInput,
          {
            backgroundColor: colors.muted,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
      />

      {visualSearchMutation.isError && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {t("camera.analyzeError")}
        </Text>
      )}

      <View style={{ height: 16 }} />
      <Button
        title={analyzing ? t("camera.analyzing") : t("camera.analyze")}
        size="lg"
        fullWidth
        onPress={onAnalyze}
        disabled={analyzing || !center}
        icon={
          analyzing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Feather name="zap" size={20} color="#ffffff" />
          )
        }
      />
      <View style={{ height: 8 }} />
      <Button
        title={t("camera.retake")}
        variant="ghost"
        fullWidth
        onPress={reset}
        disabled={analyzing}
        icon={<Feather name="refresh-ccw" size={18} color={colors.primary} />}
      />
    </View>
  );

  const renderResults = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.resultsHeader}>
        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.resultsThumb} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
            {matches.length > 0
              ? t("camera.matchesCount", { count: matches.length })
              : t("camera.noMatchesTitle")}
          </Text>
          <Text
            style={[styles.resultsSubtitle, { color: colors.mutedForeground }]}
          >
            {t("camera.withinRadius")}
          </Text>
        </View>
        <TouchableOpacity onPress={reset} style={styles.iconBtn} hitSlop={8}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyResults}>
          <Feather name="image" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("camera.noMatches")}
          </Text>
          <Text
            style={[styles.emptyText, { color: colors.mutedForeground }]}
          >
            {t("camera.noMatchesHint")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPressMatch(item)}
              style={({ pressed }) => [
                styles.matchCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.matchThumb} />
              ) : (
                <View
                  style={[
                    styles.matchThumb,
                    styles.matchThumbFallback,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Feather
                    name="package"
                    size={22}
                    color={colors.mutedForeground}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.matchTopRow}>
                  {item.brand && (
                    <Text
                      style={[
                        styles.matchBrand,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {item.brand}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.confidencePill,
                      { backgroundColor: colors.primary + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confidenceText,
                        { color: colors.primary },
                      ]}
                    >
                      {t("camera.matchPercent", { percent: Math.round(item.confidence * 100) })}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.matchName, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View style={styles.matchMetaRow}>
                  <Text style={[styles.matchPrice, { color: colors.primary }]}>
                    {formatPriceCents(item.price)}
                  </Text>
                  <Text
                    style={[styles.dotSep, { color: colors.mutedForeground }]}
                  >
                    ·
                  </Text>
                  <Text
                    style={[styles.matchShop, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.shopName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.matchDistance,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {formatDistance(item.distanceMeters)}
                  {item.shopIsOpen
                    ? `  ·  ${t("shop.openNow")}`
                    : `  ·  ${t("shop.closed")}`}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {stage === "idle" && renderIdle()}
      {stage === "captured" && renderCaptured(false)}
      {stage === "analyzing" && renderCaptured(true)}
      {stage === "results" && renderResults()}

      <ShopBottomSheet shop={openShop} onClose={() => setOpenShop(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },

  idleWrap: { flex: 1, paddingTop: 12 },
  heroWrap: { alignItems: "center", marginTop: 12, marginBottom: 24 },
  heroCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  capturedWrap: { flex: 1, paddingTop: 4 },
  previewImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#000",
  },
  label: { fontSize: 14, fontWeight: "700" },
  labelHelp: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  hintInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: { fontSize: 13, marginTop: 12, fontWeight: "600" },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  resultsThumb: { width: 48, height: 48, borderRadius: 8 },
  resultsTitle: { fontSize: 16, fontWeight: "700" },
  resultsSubtitle: { fontSize: 12, marginTop: 2 },
  iconBtn: { padding: 8 },
  emptyResults: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  matchThumb: { width: 64, height: 64, borderRadius: 10 },
  matchThumbFallback: { alignItems: "center", justifyContent: "center" },
  matchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  matchBrand: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  confidencePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  confidenceText: { fontSize: 11, fontWeight: "700" },
  matchName: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  matchMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  matchPrice: { fontSize: 14, fontWeight: "700" },
  matchShop: { fontSize: 12, flexShrink: 1 },
  dotSep: { fontSize: 13 },
  matchDistance: { fontSize: 11, marginTop: 2 },
});
