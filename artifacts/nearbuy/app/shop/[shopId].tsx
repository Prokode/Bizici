import React from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPreference } from "@/components/CurrencyPreference";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { fetchShopDetail } from "@/lib/api/shops";
import { fetchProviderDetail } from "@/lib/api/providers";
import { ShopReviewsSection } from "@/components/ShopReviewsSection";
import { chatShopHref } from "@/lib/chatItemContext";
import { BrandPhoto } from "@/components/BrandPhoto";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { ShopProductFilters, useShopProductFilters } from "@/components/ShopProductFilters";
import { ShopCatalog } from "@/components/ShopCatalog";
import { FavoriteShopButton } from "@/components/FavoriteShopButton";

export default function ShopDetails() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const detail = useQuery({
    queryKey: ["public-shop", shopId],
    queryFn: ({ signal }) => fetchShopDetail(shopId, { signal }),
    enabled: !!shopId,
  });
  const shop = detail.data?.shop;
  const productFilters = useShopProductFilters(detail.data?.products ?? [], shopId);
  const hasServices = shop?.kind === "services" || shop?.kind === "hybrid";
  const provider = useQuery({
    queryKey: ["provider-detail", shopId],
    queryFn: ({ signal }) => fetchProviderDetail(shopId, { signal }),
    enabled: !!shopId && hasServices,
    refetchInterval: 30_000,
  });
  const profile = provider.data?.provider;
  const { formatPrice } = useCurrency();
  const text = { color: colors.foreground };
  const muted = { color: colors.mutedForeground };
  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: shop?.name ?? t("shopDetails.title") }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          testID="shop-back"
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={({ pressed }) => [styles.back, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
          <Text style={[styles.backText, text]}>{t("common.back")}</Text>
        </Pressable>
        {detail.isLoading ? <ActivityIndicator color={colors.primary} /> :
          detail.isError || !shop ? (
            <View style={card}>
              <Text style={text}>{t("shopDetails.unavailable")}</Text>
              <Button title={t("common.retry")} onPress={() => detail.refetch()} />
            </View>
          ) : (
            <>
              <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.heroBand, { backgroundColor: colors.primary }]}>
                  <View style={[styles.monogram, { backgroundColor: colors.background, borderColor: colors.background }]}>
                    <BrandPhoto uri={shop.brandPhotoUrl} name={shop.name} size={60} style={{ borderRadius: 16 }} />
                  </View>
                </View>
                <View style={styles.heroBody}>
                  <Text style={[styles.title, text]}>{shop.name}</Text>
                  <View style={styles.chips}>
                    <View style={[styles.chip, { backgroundColor: shop.isOpen ? colors.accent : colors.muted }]}>
                      <View style={[styles.dot, { backgroundColor: shop.isOpen ? colors.success : colors.mutedForeground }]} />
                      <Text style={[styles.chipText, { color: shop.isOpen ? colors.success : colors.mutedForeground }]}>{t(shop.isOpen ? "shop.openNow" : "shop.closed")}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                      <Feather name="star" size={13} color={colors.primary} />
                      <Text style={[styles.chipText, text]}>{t("shopDetails.rating", { rating: shop.ratingAvg.toFixed(1), count: shop.ratingCount })}</Text>
                    </View>
                  </View>
                  {(!!shop.marketName || !!shop.stallInfo) && (
                    <View style={styles.infoRow}>
                      <Feather name="map-pin" size={15} color={colors.mutedForeground} />
                      <Text style={[styles.infoText, text]}>{[shop.marketName, shop.stallInfo].filter(Boolean).join(" · ")}</Text>
                    </View>
                  )}
                  {!!shop.fulfillment && (
                    <View style={styles.infoRow}>
                      <Feather name="truck" size={15} color={colors.mutedForeground} />
                      <Text style={[styles.infoText, text]}>
                        {t(`shopDetails.${shop.fulfillment}`)}
                        {shop.fulfillment !== "pickup_only" && shop.deliveryRadiusKm != null ? ` · ${t("shopDetails.deliveryRadius", { km: shop.deliveryRadiusKm })}` : ""}
                      </Text>
                    </View>
                  )}
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <FavoriteShopButton shopId={shop.id} name={shop.name} />
                    </View>
                  </View>
                  <View style={[styles.actions, { flexDirection: "column" }]}>
                    <View style={{ flex: 1 }}>
                      <Button title={t("shop.directions")} variant="outline" fullWidth icon={<Feather name="navigation" size={16} color={colors.primary} />} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title={t("shop.chat")} fullWidth icon={<Feather name="message-circle" size={16} color={colors.primaryForeground} />} onPress={() => router.push(chatShopHref(shop.id) as never)} />
                    </View>
                  </View>
                </View>
              </View>
              {hasServices && (
                <View style={card}>
                  <Text style={[styles.heading, text]}>{t("provider.aboutTitle")}</Text>
                  {provider.isLoading ? <ActivityIndicator color={colors.primary} /> :
                    provider.isError ? <Button title={t("common.retry")} onPress={() => provider.refetch()} /> : (
                      <>
                        {!!profile?.photoUrl && <ZoomablePhoto source={{ uri: profile.photoUrl }} photos={profile.portfolioPhotos} style={styles.photo} />}
                        <Text style={text}>{profile?.bio || t("provider.noBio")}</Text>
                        {profile?.yearsExperience != null && <Text style={muted}>{t("provider.yearsExperience", { count: profile.yearsExperience })}</Text>}
                        {profile?.serviceRadiusKm != null && <Text style={muted}>{t("provider.radiusLabel", { km: profile.serviceRadiusKm })}</Text>}
                        {!!profile?.certifications.length && <Text style={text}>{profile.certifications.join(" · ")}</Text>}
                        {profile?.portfolioPhotos.map(uri => <ZoomablePhoto key={uri} source={{ uri }} photos={profile.portfolioPhotos} style={styles.photo} />)}
                        <Button title={t("provider.openProfile")} variant="outline" onPress={() => router.push(`/provider/${shop.id}`)} />
                      </>
                    )}
                </View>
              )}
              <CurrencyPreference />
              <ShopCatalog
                shopId={shop.id}
                returnTo={`/shop/${shop.id}`}
                currency={shop.currency}
                products={detail.data?.products ?? []}
                filteredProducts={productFilters.filtered}
                services={provider.data?.services ?? []}
                productFiltersSlot={detail.data?.products.length ? <ShopProductFilters key={shop.id}
                  products={detail.data.products} {...productFilters} /> : null}
                selectedCategoryId={productFilters.filters.category}
                onSelectCategory={(category) => productFilters.setFilters(current => ({ ...current, category }))}
                formatPrice={formatPrice}
                onAskProduct={(item) => router.push(chatShopHref(shop.id, { kind: "product", id: item.id, name: item.name }) as never)}
                onAskService={(item) => router.push(chatShopHref(shop.id, { kind: "service", id: item.id, name: item.title }) as never)}
              />
              <ShopReviewsSection
                shopId={shop.id}
                shopName={shop.name}
                ratingAvg={shop.ratingAvg}
                ratingCount={shop.ratingCount}
                returnTo={`/shop/${shop.id}`}
              />
            </>
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  backText: { fontSize: 15, fontWeight: "600" },
  hero: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  heroBand: { height: 84 },
  monogram: { position: "absolute", left: 18, bottom: -30, width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heroBody: { padding: 18, paddingTop: 42, gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: "600" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 14, flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  price: { fontSize: 18, fontWeight: "800" },
  heading: { fontSize: 18, fontWeight: "700" },
  section: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  photo: { width: "100%", height: 210, borderRadius: 12, resizeMode: "cover" },
});
