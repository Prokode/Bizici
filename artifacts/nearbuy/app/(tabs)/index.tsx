import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [region, setRegion] = useState<Region | null>(null);
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
          // (common in headless previews), fall back to Paris quickly so the
          // map shows real shops instead of an empty spinner.
          const fallbackTimer = setTimeout(() => {
            if (mounted) setRegion((r) => r ?? FALLBACK_REGION);
          }, 2000);
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
            { timeout: 4000 }
          );
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError(
            "Activez la localisation pour voir les boutiques autour de vous."
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
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.placeholder,
            { backgroundColor: colors.muted },
          ]}
        >
          {region ? (
            <>
              <Feather name="map" size={56} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.placeholderText,
                  { color: colors.mutedForeground },
                ]}
              >
                {Platform.OS === "web"
                  ? "La carte interactive est disponible sur mobile (Expo Go)."
                  : "Chargement de la carte..."}
              </Text>
              {Platform.OS === "web" && shops.length > 0 && (
                <Text
                  style={[
                    styles.placeholderText,
                    { color: colors.foreground, marginTop: 8 },
                  ]}
                >
                  {shops.length} boutique{shops.length > 1 ? "s" : ""} dans un
                  rayon de 5 km.
                </Text>
              )}
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
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
  placeholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderText: {
    fontSize: 14,
    paddingHorizontal: 32,
    textAlign: "center",
  },
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
});
