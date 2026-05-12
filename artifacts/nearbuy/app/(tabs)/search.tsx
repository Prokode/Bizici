import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { fetchSearch, type PublicSearchHit } from "@/lib/api/search";
import { type PublicShop } from "@/lib/api/shops";
import { ShopBottomSheet } from "@/components/ShopBottomSheet";
import {
  useListCategories,
  useSearchServices,
  getListCategoriesQueryKey,
  getSearchServicesQueryKey,
  type Category,
  type ServiceSearchResult,
  type SearchServicesParams,
} from "@workspace/api-client-react";

const FALLBACK = { lat: 48.8566, lng: 2.3522 };

type Mode = "products" | "services";

function formatPriceCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function SearchTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string; mode?: string }>();
  const initialQ = typeof params.q === "string" ? params.q : "";
  const initialMode: Mode = params.mode === "services" ? "services" : "products";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ.trim());
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [openShop, setOpenShop] = useState<PublicShop | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [atCustomerOnly, setAtCustomerOnly] = useState(false);

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

  // ── PRODUCTS MODE ─────────────────────────────────────────────────────────
  const { data: serverHits = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["public-search", debouncedQ, center?.lat, center?.lng],
    queryFn: ({ signal }) =>
      fetchSearch({
        q: debouncedQ,
        lat: center!.lat,
        lng: center!.lng,
        signal,
      }),
    enabled: mode === "products" && !!center && debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const productResults = useMemo<PublicSearchHit[]>(() => {
    if (!debouncedQ || serverHits.length === 0) return serverHits;
    const fuse = new Fuse(serverHits, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "brand", weight: 0.2 },
        { name: "description", weight: 0.1 },
        { name: "shopName", weight: 0.1 },
      ],
      includeScore: true,
      threshold: 0.5,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    const ranked = fuse.search(debouncedQ).map((r) => r.item);
    const seen = new Set(ranked.map((r) => r.id));
    const tail = serverHits.filter((s) => !seen.has(s.id));
    return [...ranked, ...tail];
  }, [serverHits, debouncedQ]);

  // ── SERVICES MODE ─────────────────────────────────────────────────────────
  const categoriesParams = { kind: "service" as const };
  const { data: serviceCategories = [], isLoading: loadingCats } =
    useListCategories(categoriesParams, {
      query: {
        queryKey: getListCategoriesQueryKey(categoriesParams),
        enabled: mode === "services",
        staleTime: 5 * 60_000,
      },
    });

  const servicesParams: SearchServicesParams = {
    latitude: center?.lat ?? 0,
    longitude: center?.lng ?? 0,
    radiusKm: 10,
    ...(selectedCatId ? { categoryId: selectedCatId } : {}),
    ...(debouncedQ.length >= 2 ? { q: debouncedQ } : {}),
    ...(atCustomerOnly ? { serviceLocation: "at_customer" as const } : {}),
  };
  const { data: serviceHits = [], isLoading: loadingServices } =
    useSearchServices(servicesParams, {
      query: {
        queryKey: getSearchServicesQueryKey(servicesParams),
        enabled: mode === "services" && !!center,
        staleTime: 30_000,
      },
    });

  // Group services by shop so the customer sees one card per provider.
  const providerCards = useMemo(() => {
    const byShop = new Map<
      string,
      {
        shopId: string;
        shopName: string;
        distanceKm: number;
        provider: ServiceSearchResult["provider"];
        services: ServiceSearchResult["service"][];
      }
    >();
    for (const hit of serviceHits) {
      const cur = byShop.get(hit.shop.id);
      if (cur) {
        cur.services.push(hit.service);
      } else {
        byShop.set(hit.shop.id, {
          shopId: hit.shop.id,
          shopName: hit.shop.name,
          distanceKm: hit.distanceKm,
          provider: hit.provider ?? null,
          services: [hit.service],
        });
      }
    }
    return Array.from(byShop.values()).sort(
      (a, b) => a.distanceKm - b.distanceKm,
    );
  }, [serviceHits]);

  const loading = mode === "products" ? loadingProducts : loadingServices;

  const showProductsEmpty =
    mode === "products" && (!debouncedQ || debouncedQ.length < 2);
  const showProductsNoResults =
    mode === "products" &&
    !showProductsEmpty &&
    !loadingProducts &&
    productResults.length === 0 &&
    !!center;

  const showServicesEmpty =
    mode === "services" && !selectedCatId && debouncedQ.length < 2;
  const showServicesNoResults =
    mode === "services" &&
    !showServicesEmpty &&
    !loadingServices &&
    providerCards.length === 0 &&
    !!center;

  const onPressProduct = async (hit: PublicSearchHit) => {
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

  const onPressProvider = (shopId: string) => {
    router.push(`/provider/${shopId}` as never);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <ModeSegmented
        mode={mode}
        onChange={(m) => {
          setMode(m);
          // Reset query when switching modes for clarity.
          setQuery("");
          setDebouncedQ("");
          setSelectedCatId(null);
        }}
        labelProducts={t("search.modeProducts")}
        labelServices={t("search.modeServices")}
        colors={colors}
      />

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
          placeholder={t(
            mode === "services"
              ? "search.placeholderServices"
              : "search.placeholder",
          )}
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

      {mode === "services" ? (
        <>
          <CategoryChips
            categories={serviceCategories}
            loading={loadingCats}
            selectedId={selectedCatId}
            onSelect={(id) => setSelectedCatId(id)}
            allLabel={t("search.allCategories")}
            loadingLabel={t("search.loadingCategories")}
            colors={colors}
          />
          <View style={styles.atCustomerRow}>
            <CategoryChip
              label={t("serviceLocation.filterAtCustomer")}
              icon="home"
              active={atCustomerOnly}
              onPress={() => setAtCustomerOnly((v) => !v)}
              colors={colors}
            />
          </View>
        </>
      ) : null}

      {mode === "products" ? (
        showProductsEmpty ? (
          <EmptyState
            icon="search"
            title={t("search.hintTitle")}
            body={t("search.hintBody")}
            colors={colors}
          />
        ) : showProductsNoResults ? (
          <EmptyState
            icon="alert-circle"
            title={t("search.noResultsTitle", { query: debouncedQ })}
            body={t("search.noResultsHint")}
            colors={colors}
            cta={
              <Button
                title={t("search.broadcast")}
                onPress={() => {
                  // TODO: wire BroadcastRequest endpoint in a follow-up
                }}
                icon={<Feather name="radio" size={18} color="#ffffff" />}
              />
            }
          />
        ) : (
          <FlatList
            data={productResults}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              productResults.length > 0 ? (
                <Text
                  style={[styles.countLine, { color: colors.mutedForeground }]}
                >
                  {t("search.resultsCount", { count: productResults.length })}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPressProduct(item)}
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
                      style={[styles.dotSep, { color: colors.mutedForeground }]}
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
        )
      ) : showServicesEmpty ? (
        <EmptyState
          icon="briefcase"
          title={t("search.hintTitleServices")}
          body={t("search.hintBodyServices")}
          colors={colors}
        />
      ) : showServicesNoResults ? (
        <EmptyState
          icon="alert-circle"
          title={t("search.noResultsServices")}
          body=""
          colors={colors}
        />
      ) : (
        <FlatList
          data={providerCards}
          keyExtractor={(p) => p.shopId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            providerCards.length > 0 ? (
              <Text
                style={[styles.countLine, { color: colors.mutedForeground }]}
              >
                {t("search.providersCount", { count: providerCards.length })}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ProviderRow
              card={item}
              onPress={() => onPressProvider(item.shopId)}
              t={t}
              colors={colors}
            />
          )}
        />
      )}

      <ShopBottomSheet shop={openShop} onClose={() => setOpenShop(null)} />
    </View>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

type ColorTokens = ReturnType<typeof useColors>;

function ModeSegmented({
  mode,
  onChange,
  labelProducts,
  labelServices,
  colors,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  labelProducts: string;
  labelServices: string;
  colors: ColorTokens;
}) {
  const items: { key: Mode; label: string; icon: keyof typeof Feather.glyphMap }[] =
    [
      { key: "products", label: labelProducts, icon: "package" },
      { key: "services", label: labelServices, icon: "briefcase" },
    ];
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {items.map((it) => {
        const active = it.key === mode;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[
              styles.segItem,
              active && { backgroundColor: colors.background },
            ]}
          >
            <Feather
              name={it.icon}
              size={16}
              color={active ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segLabel,
                {
                  color: active ? colors.foreground : colors.mutedForeground,
                  fontWeight: active ? "700" : "500",
                },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryChips({
  categories,
  loading,
  selectedId,
  onSelect,
  allLabel,
  loadingLabel,
  colors,
}: {
  categories: Category[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allLabel: string;
  loadingLabel: string;
  colors: ColorTokens;
}) {
  if (loading) {
    return (
      <View style={styles.chipsLoading}>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginLeft: 8 }}>
          {loadingLabel}
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
      style={styles.chipsScroll}
    >
      <CategoryChip
        label={allLabel}
        icon="grid"
        active={selectedId === null}
        onPress={() => onSelect(null)}
        colors={colors}
      />
      {categories.map((c) => (
        <CategoryChip
          key={c.id}
          label={c.name}
          icon={(c.icon as keyof typeof Feather.glyphMap) || "tag"}
          active={selectedId === c.id}
          onPress={() => onSelect(selectedId === c.id ? null : c.id)}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
  colors: ColorTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.muted,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={14}
        color={active ? "#ffffff" : colors.mutedForeground}
      />
      <Text
        style={[
          styles.chipLabel,
          { color: active ? "#ffffff" : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  cta?: React.ReactNode;
  colors: ColorTokens;
}) {
  return (
    <View style={styles.center}>
      <Feather name={icon} size={40} color={colors.mutedForeground} />
      <Text style={[styles.hintTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {body ? (
        <Text style={[styles.hintBody, { color: colors.mutedForeground }]}>
          {body}
        </Text>
      ) : null}
      {cta ? (
        <>
          <View style={{ height: 16 }} />
          {cta}
        </>
      ) : null}
    </View>
  );
}

function ProviderRow({
  card,
  onPress,
  t,
  colors,
}: {
  card: {
    shopId: string;
    shopName: string;
    distanceKm: number;
    provider: ServiceSearchResult["provider"];
    services: ServiceSearchResult["service"][];
  };
  onPress: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  colors: ColorTokens;
}) {
  const provider = card.provider;
  const displayName =
    provider?.firstName || provider?.lastName
      ? `${provider?.firstName ?? ""} ${provider?.lastName ?? ""}`.trim()
      : card.shopName;
  const photo = provider?.photoUrl ?? card.services[0]?.photos[0] ?? null;
  const firstSvc = card.services[0];
  const priceLine =
    firstSvc?.pricingType === "quote"
      ? t("search.onQuote")
      : firstSvc?.pricingType === "hourly"
        ? t("search.hourlyPrice", {
            price: firstSvc.price != null ? `${firstSvc.price} €` : "—",
          })
        : firstSvc?.price != null
          ? `${firstSvc.price} €`
          : "—";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.thumb} />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbFallback,
            { backgroundColor: colors.muted },
          ]}
        >
          <Feather name="user" size={24} color={colors.mutedForeground} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text
          style={[styles.shopLine, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {firstSvc?.title ?? ""}
        </Text>
        <View style={styles.rowMetaLine}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {priceLine}
          </Text>
          <Text style={[styles.dotSep, { color: colors.mutedForeground }]}>
            ·
          </Text>
          <Text style={[styles.distance, { color: colors.mutedForeground }]}>
            {formatKm(card.distanceKm)}
          </Text>
          {card.services.length > 1 ? (
            <>
              <Text
                style={[styles.dotSep, { color: colors.mutedForeground }]}
              >
                ·
              </Text>
              <Text
                style={[styles.distance, { color: colors.mutedForeground }]}
              >
                {t("search.servicesCount", { count: card.services.length })}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <Feather
        name="chevron-right"
        size={20}
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  segItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  segLabel: { fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  chipsScroll: { marginBottom: 12, marginHorizontal: -16 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  atCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  chipsLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13, fontWeight: "600" },
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
