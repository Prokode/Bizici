import React from "react";
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { fetchShopDetail } from "@/lib/api/shops";
import { fetchProviderDetail } from "@/lib/api/providers";
import { LocationBadge } from "@/components/LocationBadge";
import { ShopReviewsSection } from "@/components/ShopReviewsSection";

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
  const hasServices = shop?.kind === "services" || shop?.kind === "hybrid";
  const provider = useQuery({
    queryKey: ["provider-detail", shopId],
    queryFn: ({ signal }) => fetchProviderDetail(shopId, { signal }),
    enabled: !!shopId && hasServices,
  });
  const profile = provider.data?.provider;
  const money = (cents: number) => `${(cents / 100).toFixed(2)} €`;
  const text = { color: colors.foreground };
  const muted = { color: colors.mutedForeground };
  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: shop?.name ?? t("shopDetails.title") }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Button title={t("common.back")} variant="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
        {detail.isLoading ? <ActivityIndicator color={colors.primary} /> :
          detail.isError || !shop ? (
            <View style={card}>
              <Text style={text}>{t("shopDetails.unavailable")}</Text>
              <Button title={t("common.retry")} onPress={() => detail.refetch()} />
            </View>
          ) : (
            <>
              <View style={card}>
                <Text style={[styles.title, text]}>{shop.name}</Text>
                <Text style={{ color: colors.primary }}>{t(shop.isOpen ? "shop.openNow" : "shop.closed")}</Text>
                {!!shop.marketName && <Text style={text}>{shop.marketName}</Text>}
                {!!shop.stallInfo && <Text style={text}>{shop.stallInfo}</Text>}
                <Text style={muted}>{t("shopDetails.rating", { rating: shop.ratingAvg.toFixed(1), count: shop.ratingCount })}</Text>
                {!!shop.fulfillment && <Text style={text}>{t(`shopDetails.${shop.fulfillment}`)}</Text>}
                {shop.fulfillment !== "pickup_only" && shop.deliveryRadiusKm != null &&
                  <Text style={muted}>{t("shopDetails.deliveryRadius", { km: shop.deliveryRadiusKm })}</Text>}
                <Button title={t("shop.directions")} variant="outline" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`)} />
                <Button title={t("shop.chat")} onPress={() => router.push(`/chat-shop/${shop.id}`)} />
              </View>
              {hasServices && (
                <View style={card}>
                  <Text style={[styles.heading, text]}>{t("provider.aboutTitle")}</Text>
                  {provider.isLoading ? <ActivityIndicator color={colors.primary} /> :
                    provider.isError ? <Button title={t("common.retry")} onPress={() => provider.refetch()} /> : (
                      <>
                        {!!profile?.photoUrl && <Image source={{ uri: profile.photoUrl }} style={styles.photo} />}
                        <Text style={text}>{profile?.bio || t("provider.noBio")}</Text>
                        {profile?.yearsExperience != null && <Text style={muted}>{t("provider.yearsExperience", { count: profile.yearsExperience })}</Text>}
                        {profile?.serviceRadiusKm != null && <Text style={muted}>{t("provider.radiusLabel", { km: profile.serviceRadiusKm })}</Text>}
                        {!!profile?.certifications.length && <Text style={text}>{profile.certifications.join(" · ")}</Text>}
                        {profile?.portfolioPhotos.map(uri => <Image key={uri} source={{ uri }} style={styles.photo} />)}
                        <Button title={t("provider.openProfile")} variant="outline" onPress={() => router.push(`/provider/${shop.id}`)} />
                        <Text style={[styles.heading, text]}>{t("shopDetails.services")}</Text>
                        {!provider.data?.services.length && <Text style={muted}>{t("shopDetails.noServices")}</Text>}
                        {provider.data?.services.map(service => (
                          <View key={service.id} style={card}>
                            <Text style={[styles.heading, text]}>{service.title}</Text>
                            {service.photos.map(uri => <Image key={uri} source={{ uri }} style={styles.photo} />)}
                            {!!service.description && <Text style={text}>{service.description}</Text>}
                            <Text style={{ color: colors.primary }}>{service.pricingType === "quote" ? t("search.onQuote") :
                              service.pricingType === "hourly" ? t("search.hourlyPrice", { price: `${service.price ?? "—"} €` }) : `${service.price ?? "—"} €`}</Text>
                            {service.durationMinutes != null && <Text style={muted}>{t("shopDetails.duration", { minutes: service.durationMinutes })}</Text>}
                            <LocationBadge mode={service.effectiveServiceLocation} colors={colors} t={t} />
                          </View>
                        ))}
                      </>
                    )}
                </View>
              )}
              {(shop.kind !== "services" || !!detail.data?.products.length) && (
                <>
                  <Text style={[styles.heading, text]}>{t("shopDetails.products")}</Text>
                  {!detail.data?.products.length && <Text style={muted}>{t("shopDetails.noProducts")}</Text>}
                  {detail.data?.products.map(product => (
                    <View key={product.id} style={card}>
                      {product.photos.map(uri => <Image key={uri} source={{ uri }} style={styles.photo} />)}
                      <Text style={[styles.heading, text]}>{product.name}</Text>
                      {!!product.brand && <Text style={muted}>{product.brand}</Text>}
                      {!!product.description && <Text style={text}>{product.description}</Text>}
                      <Text style={{ color: colors.primary }}>{money(product.price)}</Text>
                      <Text style={muted}>{t(product.stockStatus === "in_stock" ? "shopDetails.inStock" : "shopDetails.outOfStock")}</Text>
                    </View>
                  ))}
                </>
              )}
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
  title: { fontSize: 26, fontWeight: "800" },
  heading: { fontSize: 18, fontWeight: "700" },
  photo: { width: "100%", height: 210, borderRadius: 12, resizeMode: "cover" },
});
