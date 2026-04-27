import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { fetchNearbyShops, type PublicShop } from "@/lib/publicApi";
import { ShopMarker } from "@/components/ShopMarker";
import { ShopBottomSheet } from "@/components/ShopBottomSheet";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const FALLBACK_REGION: Region = {
  // Paris by default until we get the user's GPS
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatPriceCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // On web, seed the region with the fallback immediately so the shops list
  // renders without waiting for `navigator.geolocation` (which can hang
  // indefinitely in headless previews and when the user denies permission
  // silently). Real geolocation will upgrade the region in the effect below.
  const [region, setRegion] = useState<Region | null>(
    Platform.OS === "web" ? FALLBACK_REGION : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedShop, setSelectedShop] = useState<PublicShop | null>(null);
  const [maps, setMaps] = useState<{
    MapView: any;
    Marker: any;
  } | null>(null);

  // Lazy-load react-native-maps so web doesn't crash on bundle
  useEffect(() => {
    if (Platform.OS !== "web") {
      import("react-native-maps").then((mod) => {
        setMaps({ MapView: mod.default, Marker: mod.Marker });
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === "web") {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            setRegion(FALLBACK_REGION);
            return;
          }
          // Belt-and-braces: even if the browser never resolves geolocation
          // (very common in headless previews and when permissions aren't
          // granted), fall back to Paris quickly so the list shows real
          // shops instead of an empty spinner.
          const fallbackTimer = setTimeout(() => {
            if (mounted) setRegion((r) => r ?? FALLBACK_REGION);
          }, 800);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(fallbackTimer);
              if (!mounted) return;
              setRegion({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            },
            () => {
              clearTimeout(fallbackTimer);
              if (mounted) setRegion(FALLBACK_REGION);
            },
            { timeout: 4000 },
          );
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError(
            "Activez la localisation pour voir les boutiques autour de vous.",
          );
          setRegion(FALLBACK_REGION);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } catch {
        if (mounted) setRegion(FALLBACK_REGION);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Round center to ~3 decimal places (~111m grid) so we don't refetch on
  // every micro-pan.
  const center = useMemo(() => {
    if (!region) return null;
    const lat = Math.round(region.latitude * 1000) / 1000;
    const lng = Math.round(region.longitude * 1000) / 1000;
    return { lat, lng };
  }, [region]);

  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["public-shops", center?.lat, center?.lng],
    queryFn: ({ signal }) =>
      fetchNearbyShops({
        lat: center!.lat,
        lng: center!.lng,
        radiusKm: 5,
        signal,
      }),
    enabled: !!center,
    staleTime: 60_000,
  });

  const onSubmitSearch = () => {
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const showMap = Platform.OS !== "web" && maps && region;

  // Sort shops by distance for the list view (web fallback).
  const sortedShops = useMemo(
    () => [...shops].sort((a, b) => a.distanceMeters - b.distanceMeters),
    [shops],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showMap ? (
        <maps.MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {shops.map((s) => (
            <maps.Marker
              key={s.id}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              onPress={() => setSelectedShop(s)}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <ShopMarker
                productCount={s.productCount}
                isOpen={s.isOpen}
              />
            </maps.Marker>
          ))}
        </maps.MapView>
      ) : (
        // Web fallback: scrollable list of nearby shops with the same data
        // the native map would show. The user can still tap a shop to open
        // the bottom sheet.
        <FlatList
          data={sortedShops}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 132, paddingBottom: 32 },
          ]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {Platform.OS === "web" && (
                <View
                  style={[
                    styles.webHint,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather name="info" size={14} color={colors.mutedForeground} />
                  <Text
                    style={[styles.webHintText, { color: colors.mutedForeground }]}
                  >
                    Carte interactive disponible sur mobile (Expo Go). Voici
                    les boutiques proches.
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !center || loadingShops ? (
              <View style={styles.emptyCenter}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {!center
                    ? "Recherche de votre position…"
                    : "Recherche des boutiques…"}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyCenter}>
                <Feather name="map-pin" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Aucune boutique dans un rayon de 5 km
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Élargissez votre zone ou diffusez votre demande depuis la
                  recherche.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedShop(item)}
              style={({ pressed }) => [
                styles.shopCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.shopHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.shopName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.marketName && (
                    <Text
                      style={[
                        styles.shopMarket,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {item.marketName}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.openBadge,
                    {
                      backgroundColor: item.isOpen
                        ? "#10b98122"
                        : colors.muted,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.openDot,
                      {
                        backgroundColor: item.isOpen
                          ? "#10b981"
                          : colors.mutedForeground,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.openText,
                      {
                        color: item.isOpen ? "#047857" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {item.isOpen ? "Ouvert" : "Fermé"}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Feather
                  name="navigation"
                  size={12}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {formatDistance(item.distanceMeters)}
                </Text>
                <Text
                  style={[styles.dotSep, { color: colors.mutedForeground }]}
                >
                  ·
                </Text>
                <Feather
                  name="package"
                  size={12}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {item.productCount} produit{item.productCount > 1 ? "s" : ""}
                </Text>
              </View>

              {item.previewProducts.length > 0 && (
                <View style={styles.previewRow}>
                  {item.previewProducts.slice(0, 4).map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.previewItem,
                        { borderColor: colors.border },
                      ]}
                    >
                      {p.photo ? (
                        <Image
                          source={{ uri: p.photo }}
                          style={styles.previewThumb}
                        />
                      ) : (
                        <View
                          style={[
                            styles.previewThumb,
                            styles.previewThumbFallback,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Feather
                            name="package"
                            size={18}
                            color={colors.mutedForeground}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.previewName,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[styles.previewPrice, { color: colors.primary }]}
                      >
                        {formatPriceCents(p.price)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          )}
        />
      )}

      <View
        style={[
          styles.searchWrap,
          {
            top: insets.top + 12,
            backgroundColor: colors.background,
            borderColor: colors.border,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cherchez un produit (ex: jeans bleus)"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={12}>
            <Feather
              name="x-circle"
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      {/* Status pill */}
      <View
        style={[
          styles.statusPill,
          {
            top: insets.top + 76,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        {loadingShops || !center ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="navigation" size={14} color={colors.primary} />
        )}
        <Text style={[styles.statusText, { color: colors.foreground }]}>
          {!center
            ? "Recherche de votre position…"
            : loadingShops
              ? "Recherche des boutiques…"
              : shops.length === 0
                ? "Aucune boutique dans un rayon de 5 km"
                : `${shops.length} boutique${shops.length > 1 ? "s" : ""} · 5 km`}
        </Text>
      </View>

      {error && (
        <View
          style={[
            styles.errorBanner,
            {
              top: insets.top + 124,
              backgroundColor: colors.destructive,
            },
          ]}
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ShopBottomSheet
        shop={selectedShop}
        onClose={() => setSelectedShop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  statusPill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  errorBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  errorText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },

  listContent: { paddingHorizontal: 16, gap: 12 },
  listHeader: { marginBottom: 12 },
  webHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  webHintText: { fontSize: 12, flex: 1, lineHeight: 16 },
  emptyCenter: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  shopCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  shopHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  shopName: { fontSize: 16, fontWeight: "700" },
  shopMarket: { fontSize: 12, marginTop: 2 },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 11, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 12 },
  dotSep: { fontSize: 12, marginHorizontal: 2 },
  previewRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  previewItem: {
    width: 80,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    gap: 4,
  },
  previewThumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 6,
  },
  previewThumbFallback: { alignItems: "center", justifyContent: "center" },
  previewName: { fontSize: 11, fontWeight: "600" },
  previewPrice: { fontSize: 11, fontWeight: "700" },
});
