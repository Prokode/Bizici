import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  fetchSearch,
  fetchShopDetail,
  type PublicSearchHit,
  type PublicShop,
} from "@/lib/publicApi";
import { ShopBottomSheet } from "@/components/ShopBottomSheet";

const FALLBACK = { lat: 48.8566, lng: 2.3522 };

function formatPriceCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function SearchTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQ = typeof params.q === "string" ? params.q : "";

  const [query, setQuery] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ.trim());
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [openShop, setOpenShop] = useState<PublicShop | null>(null);

  // Debounce typing → 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Get user position once (with web fallback to Paris).
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === "web") {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            setCenter(FALLBACK);
            return;
          }
          fallbackTimer.current = setTimeout(() => {
            if (mounted) setCenter((c) => c ?? FALLBACK);
          }, 1500);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
              if (!mounted) return;
              setCenter({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {
              if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
              if (mounted) setCenter(FALLBACK);
            },
            { timeout: 4000 },
          );
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCenter(FALLBACK);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        if (mounted) setCenter(FALLBACK);
      }
    })();
    return () => {
      mounted = false;
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, []);

  const { data: serverHits = [], isLoading: loading } = useQuery({
    queryKey: ["public-search", debouncedQ, center?.lat, center?.lng],
    queryFn: ({ signal }) =>
      fetchSearch({
        q: debouncedQ,
        lat: center!.lat,
        lng: center!.lng,
        signal,
      }),
    enabled: !!center && debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  // Fuse.js client-side fuzzy re-rank to tolerate typos
  const results = useMemo<PublicSearchHit[]>(() => {
    if (!debouncedQ || serverHits.length === 0) return serverHits;
    const fuse = new Fuse(serverHits, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "brand", weight: 0.2 },
        { name: "description", weight: 0.1 },
        { name: "shopName", weight: 0.1 },
      ],
      includeScore: true,
      threshold: 0.5, // fairly tolerant
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    const ranked = fuse.search(debouncedQ).map((r) => r.item);
    // Keep server-only hits (those Fuse dropped) at the bottom — don't lose
    // perfectly valid matches just because Fuse's threshold was too strict.
    const seen = new Set(ranked.map((r) => r.id));
    const tail = serverHits.filter((s) => !seen.has(s.id));
    return [...ranked, ...tail];
  }, [serverHits, debouncedQ]);

  const onPressResult = async (hit: PublicSearchHit) => {
    // Open the shop's bottom sheet by hydrating a PublicShop-shaped object.
    // Distance & previewProducts come from the search hit; productCount stays
    // 0 until we open the full shop detail (which the bottom sheet itself
    // does on demand).
    const stub: PublicShop = {
      id: hit.shopId,
      sellerId: "",
      name: hit.shopName,
      marketName: hit.shopMarketName,
      stallInfo: null,
      longitude: 0,
      latitude: 0,
      isOpen: hit.shopIsOpen,
      ratingAvg: 0,
      ratingCount: 0,
      distanceMeters: hit.distanceMeters,
      productCount: 0,
      previewProducts: [
        {
          id: hit.id,
          name: hit.name,
          price: hit.price,
          photo: hit.photo,
        },
      ],
    };
    setOpenShop(stub);
  };

  const showEmptyState = !debouncedQ || debouncedQ.length < 2;
  const showNoResults =
    !showEmptyState && !loading && results.length === 0 && !!center;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Que cherchez-vous ?"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={() => setDebouncedQ(query.trim())}
          autoFocus={!initialQ}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={12}>
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {showEmptyState ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>
            Trouvez un produit près de vous
          </Text>
          <Text style={[styles.hintBody, { color: colors.mutedForeground }]}>
            Tapez le nom d'un produit (au moins 2 lettres). La recherche tolère
            les fautes d'orthographe et trie par distance.
          </Text>
        </View>
      ) : showNoResults ? (
        <View style={styles.center}>
          <Feather
            name="alert-circle"
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>
            Aucun résultat pour « {debouncedQ} »
          </Text>
          <Text style={[styles.hintBody, { color: colors.mutedForeground }]}>
            Diffusez votre demande aux boutiques dans un rayon de 5 km — vous
            serez notifié dès qu'un vendeur l'aura en stock.
          </Text>
          <View style={{ height: 16 }} />
          <Button
            title="Diffuser ma demande"
            onPress={() => {
              // TODO: wire BroadcastRequest endpoint in a follow-up
            }}
            icon={<Feather name="radio" size={18} color="#ffffff" />}
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text
                style={[styles.countLine, { color: colors.mutedForeground }]}
              >
                {results.length} résultat{results.length > 1 ? "s" : ""} dans
                un rayon de 5 km
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPressResult(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.thumb} />
              ) : (
                <View
                  style={[
                    styles.thumb,
                    styles.thumbFallback,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Feather
                    name="package"
                    size={24}
                    color={colors.mutedForeground}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                {item.brand && (
                  <Text
                    style={[styles.brand, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.brand}
                  </Text>
                )}
                <Text
                  style={[styles.rowTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View style={styles.rowMetaLine}>
                  <Text style={[styles.price, { color: colors.primary }]}>
                    {formatPriceCents(item.price)}
                  </Text>
                  <Text
                    style={[
                      styles.dotSep,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    ·
                  </Text>
                  <Text
                    style={[styles.shopLine, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.shopName}
                  </Text>
                </View>
                <Text
                  style={[styles.distance, { color: colors.mutedForeground }]}
                >
                  {formatDistance(item.distanceMeters)}
                  {item.shopIsOpen ? "  ·  Ouvert" : "  ·  Fermé"}
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

      <ShopBottomSheet
        shop={openShop}
        onClose={() => setOpenShop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  hintTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  hintBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { paddingBottom: 24 },
  countLine: { fontSize: 12, marginBottom: 10, paddingHorizontal: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  brand: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  rowTitle: { fontSize: 15, fontWeight: "700", lineHeight: 19 },
  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  price: { fontSize: 14, fontWeight: "700" },
  dotSep: { fontSize: 14 },
  shopLine: { fontSize: 13, flexShrink: 1 },
  distance: { fontSize: 12, marginTop: 2 },
});
