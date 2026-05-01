import React from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import type { CoursePlan } from "@/lib/courseApi";

type Cached = {
  plan: CoursePlan;
  center: { lat: number; lng: number };
};

async function openMaps(lat: number, lng: number) {
  const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  let primaryUrl = universalUrl;
  if (Platform.OS === "ios") {
    primaryUrl = `maps://?daddr=${lat},${lng}&dirflg=d`;
  } else if (Platform.OS === "android") {
    primaryUrl = `geo:0,0?q=${lat},${lng}`;
  }
  try {
    const supported = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(supported ? primaryUrl : universalUrl);
  } catch {
    try {
      await Linking.openURL(universalUrl);
    } catch {
      // give up silently
    }
  }
}

export default function CourseRunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const formatDistance = React.useCallback(
    (meters: number) => {
      if (meters < 1000) {
        return t("course.distanceMeters", { m: meters });
      }
      return t("course.distanceKm", { km: (meters / 1000).toFixed(1) });
    },
    [t],
  );

  const cached = queryClient.getQueryData<Cached>([
    "course",
    "plan",
    "current",
  ]);
  const stops = cached?.plan.stops ?? [];

  const [index, setIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);

  // If user re-enters the screen with no plan cached, bounce back.
  React.useEffect(() => {
    if (!cached) {
      router.replace("/course");
    }
  }, [cached, router]);

  if (!cached) return null;

  if (stops.length === 0) {
    return (
      <View
        style={[
          styles.fullCenter,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <Feather name="map-pin" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("course.noResults", { km: 10 })}
        </Text>
        <View style={{ height: 16 }} />
        <Button
          title={t("course.doneCta")}
          onPress={() => router.replace("/(tabs)")}
        />
      </View>
    );
  }

  if (done) {
    return (
      <View
        style={[
          styles.fullCenter,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <LinearGradient
          colors={["#F58220", "#E26A0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.doneCircle}
        >
          <Feather name="check" size={56} color="#ffffff" />
        </LinearGradient>
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>
          {t("course.doneTitle")}
        </Text>
        <Text style={[styles.doneBody, { color: colors.mutedForeground }]}>
          {t("course.doneBody")}
        </Text>
        <View style={{ height: 24 }} />
        <Button
          title={t("course.doneCta")}
          onPress={() => router.replace("/(tabs)")}
          size="lg"
        />
      </View>
    );
  }

  const stop = stops[index];
  if (!stop) {
    setDone(true);
    return null;
  }

  const isLast = index === stops.length - 1;

  const handleNext = () => {
    if (isLast) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleDirections = () => {
    if (!stop.nearestShop) return;
    void openMaps(stop.nearestShop.latitude, stop.nearestShop.longitude);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Alert.alert(
              t("course.clearConfirmTitle"),
              t("course.clearConfirmBody"),
              [
                { text: t("course.cancel"), style: "cancel" },
                {
                  text: t("course.confirm"),
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ],
            );
          }}
          hitSlop={12}
        >
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
          {t("course.stopOf", {
            current: index + 1,
            total: stops.length,
          })}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[
          styles.progressBar,
          { backgroundColor: colors.muted },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((index + 1) / stops.length) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lookingLabel, { color: colors.mutedForeground }]}>
          {t("course.looking")}
        </Text>
        <Text style={[styles.queryText, { color: colors.foreground }]}>
          {stop.query}
        </Text>

        {stop.nearestShop ? (
          <View
            style={[
              styles.shopCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.shopHeader}>
              <View
                style={[
                  styles.shopIcon,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Feather name="shopping-bag" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.shopName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {stop.nearestShop.name}
                </Text>
                {stop.nearestShop.marketName ? (
                  <Text
                    style={[
                      styles.shopMarket,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {stop.nearestShop.marketName}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather
                  name="navigation-2"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.metaText, { color: colors.foreground }]}
                >
                  {formatDistance(stop.nearestShop.distanceMeters)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: stop.nearestShop.isOpen
                        ? "#10B981"
                        : "#EF4444",
                    },
                  ]}
                />
                <Text
                  style={[styles.metaText, { color: colors.foreground }]}
                >
                  {stop.nearestShop.isOpen
                    ? t("course.openNow")
                    : t("course.closedNow")}
                </Text>
              </View>
            </View>

            {stop.products.length > 0 ? (
              <View style={styles.productsBlock}>
                <Text
                  style={[
                    styles.productsTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t("course.matchingProducts")}
                </Text>
                {stop.products.map((p) => (
                  <View key={p.id} style={styles.productRow}>
                    {p.photo ? (
                      <Image
                        source={{ uri: p.photo }}
                        style={styles.productPhoto}
                      />
                    ) : (
                      <View
                        style={[
                          styles.productPhoto,
                          {
                            backgroundColor: colors.muted,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <Feather
                          name="image"
                          size={18}
                          color={colors.mutedForeground}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.productName,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.productPrice,
                          { color: colors.primary },
                        ]}
                      >
                        {p.price.toFixed(2)} €
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.shopCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                alignItems: "center",
                gap: 12,
                paddingVertical: 32,
              },
            ]}
          >
            <Feather
              name="alert-circle"
              size={36}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.noShopText,
                { color: colors.mutedForeground },
              ]}
            >
              {t("course.noShopForItem")}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {stop.nearestShop ? (
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }}>
              <Button
                title={t("course.directions")}
                variant="outline"
                fullWidth
                size="lg"
                onPress={handleDirections}
                icon={
                  <Feather name="navigation" size={18} color={colors.primary} />
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={isLast ? t("course.finish") : t("course.next")}
                fullWidth
                size="lg"
                onPress={handleNext}
                icon={
                  <Feather
                    name={isLast ? "check" : "arrow-right"}
                    size={18}
                    color="#ffffff"
                  />
                }
              />
            </View>
          </View>
        ) : (
          <Button
            title={isLast ? t("course.finish") : t("course.skipStop")}
            fullWidth
            size="lg"
            onPress={handleNext}
            variant={isLast ? "primary" : "outline"}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  progressText: { fontSize: 13, fontWeight: "600" },
  progressBar: {
    height: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  lookingLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  queryText: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  shopCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  shopHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  shopIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shopName: { fontSize: 17, fontWeight: "700" },
  shopMarket: { fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 13, fontWeight: "600" },
  productsBlock: { gap: 10, marginTop: 4 },
  productsTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  productRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  productPhoto: { width: 44, height: 44, borderRadius: 8 },
  productName: { fontSize: 14, fontWeight: "600" },
  productPrice: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  noShopText: { fontSize: 14, textAlign: "center", paddingHorizontal: 12 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerRow: { flexDirection: "row", gap: 10 },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  doneCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
  },
  doneTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  doneBody: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
