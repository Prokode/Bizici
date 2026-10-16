import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { fetchShopReviews } from "@/lib/api/shops";
import { ReviewModal } from "@/components/ReviewModal";

type Props = {
  /** Review target. Services and hybrid businesses share the shop id. */
  shopId: string;
  shopName: string | null;
  ratingAvg: number;
  ratingCount: number;
  /** Route to return to after sign-in. */
  returnTo: string;
};

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Feather
          key={n}
          name="star"
          size={size}
          color={n <= Math.round(rating) ? "#F59E0B" : colors.border}
        />
      ))}
    </View>
  );
}

/**
 * Review list + write/edit entry point for a shop or service provider.
 * Owns fetching, auth gating and the ReviewModal (which handles submission
 * and cache invalidation of ["shop-reviews"], ["public-shop"], ["nearby-shops"]).
 */
export function ShopReviewsSection({ shopId, shopName, ratingAvg, ratingCount, returnTo }: Props) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const reviewsQuery = useQuery({
    queryKey: ["shop-reviews", shopId],
    queryFn: ({ signal }) => fetchShopReviews(shopId, { limit: 20, signal }),
    enabled: !!shopId,
  });
  const reviews = reviewsQuery.data?.reviews ?? [];

  const onWritePress = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/(auth)/sign-in?next=${encodeURIComponent(returnTo)}` as Href);
      return;
    }
    setModalOpen(true);
  };

  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <View style={card}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t("shop.reviews")}</Text>
          <View style={styles.summary}>
            <StarRow rating={ratingAvg} size={14} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {ratingAvg.toFixed(1)} · {t("shop.reviewsCount", { count: ratingCount })}
            </Text>
          </View>
        </View>
        <Pressable
          testID="write-review"
          accessibilityRole="button"
          accessibilityLabel={isSignedIn ? t("shop.writeReview") : t("shop.signInToReview")}
          onPress={onWritePress}
          hitSlop={8}
          style={[styles.writeButton, { borderColor: colors.primary }]}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.writeText, { color: colors.primary }]}>{t("shop.writeReview")}</Text>
        </Pressable>
      </View>

      {reviewsQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : reviewsQuery.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => reviewsQuery.refetch()}
          style={styles.stateBox}
        >
          <Feather name="alert-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {t("shop.reviewsError")} {t("common.retry")}
          </Text>
        </Pressable>
      ) : reviews.length === 0 ? (
        <View style={styles.stateBox}>
          <Feather name="message-square" size={18} color={colors.mutedForeground} />
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t("shop.noReviews")}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {reviews.map((r) => (
            <View
              key={r.id}
              style={[styles.review, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <View style={styles.reviewTop}>
                <Text style={[styles.reviewName, { color: colors.foreground }]} numberOfLines={1}>
                  {r.customerName ?? t("shop.anonymousCustomer")}
                </Text>
                <StarRow rating={r.rating} />
              </View>
              {r.comment ? (
                <Text style={[styles.comment, { color: colors.mutedForeground }]}>{r.comment}</Text>
              ) : null}
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {new Date(r.createdAt).toLocaleDateString(i18n.language?.startsWith("en") ? "en-GB" : "fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      <ReviewModal
        shopId={modalOpen ? shopId : null}
        shopName={shopName}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  title: { fontSize: 18, fontWeight: "700" },
  summary: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { fontSize: 13 },
  writeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  writeText: { fontSize: 13, fontWeight: "700" },
  stateBox: { alignItems: "center", gap: 6, paddingVertical: 16 },
  empty: { textAlign: "center", fontSize: 14 },
  review: { padding: 12, borderRadius: 12, borderWidth: 1 },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  reviewName: { fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 },
  comment: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  date: { fontSize: 11, marginTop: 6 },
});
