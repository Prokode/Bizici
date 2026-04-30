import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  fetchProviderDetail,
  type PublicProviderDetail,
  type PublicService,
} from "@/lib/publicApi";

function formatPrice(svc: PublicService, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (svc.pricingType === "quote") return t("search.onQuote");
  if (svc.pricingType === "hourly")
    return t("search.hourlyPrice", {
      price: svc.price != null ? `${svc.price} €` : "—",
    });
  return svc.price != null ? `${svc.price} €` : "—";
}

export default function ProviderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<PublicProviderDetail>({
    queryKey: ["provider-detail", shopId],
    queryFn: ({ signal }) => fetchProviderDetail(String(shopId), { signal }),
    enabled: !!shopId,
  });

  if (isLoading) {
    return (
      <View
        style={[styles.fullCenter, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
          {t("provider.loading")}
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View
        style={[
          styles.fullCenter,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <Feather
          name="alert-circle"
          size={48}
          color={colors.mutedForeground}
        />
        <Text
          style={[
            styles.errorTitle,
            { color: colors.foreground, marginTop: 12 },
          ]}
        >
          {t("provider.errorTitle")}
        </Text>
        <View style={{ height: 16 }} />
        <Button
          title={t("provider.errorRetry")}
          onPress={() => refetch()}
          icon={
            isRefetching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Feather name="rotate-ccw" size={16} color="#ffffff" />
            )
          }
        />
      </View>
    );
  }

  const { shop, provider, services } = data;
  const displayName =
    provider?.firstName || provider?.lastName
      ? `${provider?.firstName ?? ""} ${provider?.lastName ?? ""}`.trim()
      : shop.name;
  const heroPhoto =
    provider?.photoUrl ?? provider?.portfolioPhotos?.[0] ?? null;
  const showAge =
    provider?.age != null && provider?.hideAge === false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <View style={{ position: "relative" }}>
        {heroPhoto ? (
          <Image source={{ uri: heroPhoto }} style={styles.hero} />
        ) : (
          <View
            style={[
              styles.hero,
              styles.heroFallback,
              { backgroundColor: colors.muted },
            ]}
          >
            <Feather name="user" size={64} color={colors.mutedForeground} />
          </View>
        )}
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              top: insets.top + 8,
              backgroundColor: "rgba(0,0,0,0.45)",
            },
          ]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ flex: 1 }}
      >
        {/* Identity */}
        <View style={[styles.headerBlock, { borderBottomColor: colors.border }]}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {displayName}
            </Text>
            {provider?.isVerified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Feather name="check" size={10} color="#ffffff" />
                <Text style={styles.verifiedText}>{t("provider.verified")}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {showAge ? (
              <Text
                style={[styles.metaItem, { color: colors.mutedForeground }]}
              >
                {t("provider.ageLabel", { age: provider!.age })}
              </Text>
            ) : null}
            {provider?.yearsExperience != null ? (
              <>
                {showAge ? <Dot color={colors.mutedForeground} /> : null}
                <Text
                  style={[styles.metaItem, { color: colors.mutedForeground }]}
                >
                  {t("provider.yearsExperience", {
                    count: provider.yearsExperience,
                  })}
                </Text>
              </>
            ) : null}
          </View>
          {provider?.serviceRadiusKm ? (
            <View style={styles.radiusRow}>
              <Feather
                name="map-pin"
                size={14}
                color={colors.mutedForeground}
              />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 13,
                  marginLeft: 6,
                }}
              >
                {t("provider.radiusLabel", { km: provider.serviceRadiusKm })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bio */}
        <Section title={t("provider.aboutTitle")} colors={colors}>
          <Text
            style={[
              styles.body,
              { color: provider?.bio ? colors.foreground : colors.mutedForeground },
            ]}
          >
            {provider?.bio || t("provider.noBio")}
          </Text>
        </Section>

        {/* Certifications */}
        <Section title={t("provider.certificationsTitle")} colors={colors}>
          {provider?.certifications && provider.certifications.length > 0 ? (
            <View style={styles.certsRow}>
              {provider.certifications.map((c) => (
                <View
                  key={c}
                  style={[
                    styles.certChip,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather name="award" size={12} color={colors.primary} />
                  <Text
                    style={[
                      styles.certText,
                      { color: colors.foreground },
                    ]}
                  >
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {t("provider.noCertifications")}
            </Text>
          )}
        </Section>

        {/* Services */}
        <Section title={t("provider.servicesTitle")} colors={colors}>
          {services.length === 0 ? (
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {t("provider.noServices")}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {services.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.serviceCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.serviceTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      {s.title}
                    </Text>
                    {s.description ? (
                      <Text
                        style={[
                          styles.serviceDesc,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={2}
                      >
                        {s.description}
                      </Text>
                    ) : null}
                    {s.categories.length > 0 ? (
                      <View style={styles.serviceCatsRow}>
                        {s.categories.map((c) => (
                          <Text
                            key={c.id}
                            style={[
                              styles.serviceCat,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {c.name}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[styles.servicePrice, { color: colors.primary }]}
                  >
                    {formatPrice(s, t)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Portfolio */}
        <Section title={t("provider.portfolioTitle")} colors={colors}>
          {provider?.portfolioPhotos && provider.portfolioPhotos.length > 0 ? (
            <FlatList
              data={provider.portfolioPhotos}
              horizontal
              keyExtractor={(uri) => uri}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.portfolioImg} />
              )}
            />
          ) : (
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {t("provider.noPortfolio")}
            </Text>
          )}
        </Section>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Button
          title={t("provider.chat")}
          onPress={() => router.push(`/chat-shop/${shop.id}` as never)}
          icon={
            <Feather name="message-circle" size={18} color="#ffffff" />
          }
        />
      </View>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <Text style={{ color, marginHorizontal: 6 }}>·</Text>;
}

const styles = StyleSheet.create({
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  hero: { width: "100%", height: 240 },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  name: { fontSize: 24, fontWeight: "800" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 11, color: "#ffffff", fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  metaItem: { fontSize: 14 },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21 },
  certsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  certChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  certText: { fontSize: 12, fontWeight: "600" },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  serviceTitle: { fontSize: 15, fontWeight: "700" },
  serviceDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  serviceCatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  serviceCat: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  servicePrice: { fontSize: 15, fontWeight: "800" },
  portfolioImg: { width: 140, height: 140, borderRadius: 12 },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
