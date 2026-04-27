import React, { useEffect, useState } from "react";
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

import { useColors } from "@/hooks/useColors";

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
  const [MapView, setMapView] =
    useState<typeof import("react-native-maps").default | null>(null);

  // Lazy-load react-native-maps so web doesn't crash on bundle
  useEffect(() => {
    if (Platform.OS !== "web") {
      import("react-native-maps").then((mod) => setMapView(() => mod.default));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === "web") {
          if (!navigator.geolocation) {
            setRegion(FALLBACK_REGION);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!mounted) return;
              setRegion({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            },
            () => mounted && setRegion(FALLBACK_REGION),
            { timeout: 5000 }
          );
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Activez la localisation pour voir les boutiques autour de vous.");
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

  const onSubmitSearch = () => {
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const showMap = Platform.OS !== "web" && MapView && region;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showMap ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
        />
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
              <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
                {Platform.OS === "web"
                  ? "La carte est disponible sur mobile (Expo Go)."
                  : "Chargement de la carte..."}
              </Text>
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
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {error && (
        <View
          style={[
            styles.errorBanner,
            {
              top: insets.top + 76,
              backgroundColor: colors.destructive,
            },
          ]}
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderText: { fontSize: 14, paddingHorizontal: 32, textAlign: "center" },
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
