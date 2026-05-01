import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getGetShopDashboardQueryOptions } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { KycBanner } from "@/components/KycBanner";

type StatCardProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string | number;
  hint?: string;
  tint?: string;
};

function StatCard({ icon, label, value, hint, tint }: StatCardProps) {
  const colors = useColors();
  const accent = tint ?? colors.primary;
  return (
    <Card style={styles.statCard}>
      <View style={[styles.iconBubble, { backgroundColor: accent + "22" }]}>
        <Feather name={icon} size={18} color={accent} />
      </View>
      <Text
        style={[
          styles.statLabel,
          { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
        ]}
      >
        {value}
      </Text>
      {hint ? (
        <Text
          style={[
            styles.statHint,
            { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

function formatRelative(iso: string | null | undefined, lang: string, fallback: string): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  const isFr = !lang.startsWith("en");
  if (sec < 60) return isFr ? "à l'instant" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return isFr ? `il y a ${min} min` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return isFr ? `il y a ${h} h` : `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return isFr ? `il y a ${d} j` : `${d} d ago`;
  return date.toLocaleDateString(isFr ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery({
    ...getGetShopDashboardQueryOptions(shopId as string),
    enabled: !!shopId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
      >
        <Skeleton style={styles.skeletonHeader} />
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (isError || !data) {
    return (
      <View
        style={[
          styles.errorWrap,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <Feather name="alert-circle" size={28} color={colors.destructive} />
        <Text
          style={[
            styles.errorText,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" },
          ]}
        >
          {t("dashboard.loadFailed")}
        </Text>
        <Text
          onPress={() => refetch()}
          style={[
            styles.retry,
            { color: colors.primary, fontFamily: "PlusJakartaSans_600SemiBold" },
          ]}
        >
          {t("common.retry")}
        </Text>
        {error instanceof Error ? (
          <Text
            style={[
              styles.errorDetail,
              { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" },
            ]}
            numberOfLines={2}
          >
            {error.message}
          </Text>
        ) : null}
      </View>
    );
  }

  const ratingDisplay =
    data.ratingAvg !== null && data.ratingAvg !== undefined
      ? data.ratingAvg.toFixed(1)
      : "—";
  const ratingHint =
    data.reviewCount > 0
      ? t("dashboard.ratingCount", { count: data.reviewCount })
      : t("dashboard.noReviews");

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
        >
          {t("dashboard.title")}
        </Text>
        {isRefetching ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : null}
      </View>
      <Text
        style={[
          styles.headerSubtitle,
          { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" },
        ]}
      >
        {t("dashboard.subtitle")}
      </Text>

      {shopId ? <KycBanner shopId={shopId as string} /> : null}

      <View style={styles.grid}>
        <StatCard
          icon="package"
          label={t("dashboard.products")}
          value={data.totalProducts}
          hint={t("dashboard.productsHint", { count: data.inStockCount })}
          tint={colors.primary}
        />
        <StatCard
          icon="alert-triangle"
          label={t("dashboard.outOfStock")}
          value={data.outOfStockCount}
          hint={
            data.outOfStockCount > 0
              ? t("dashboard.outOfStockNeed")
              : t("dashboard.outOfStockOk")
          }
          tint={data.outOfStockCount > 0 ? "#f59e0b" : colors.primary}
        />
        <StatCard
          icon="message-circle"
          label={t("dashboard.conversations")}
          value={data.conversationCount}
          hint={
            data.unreadCount > 0
              ? t("dashboard.conversationsUnread", { count: data.unreadCount })
              : t("dashboard.conversationsAllRead")
          }
          tint={data.unreadCount > 0 ? "#ef4444" : colors.primary}
        />
        <StatCard
          icon="send"
          label={t("dashboard.messagesReceived")}
          value={data.messages7d}
          hint={t("dashboard.messagesReceivedHint")}
          tint={colors.primary}
        />
        <StatCard
          icon="star"
          label={t("dashboard.ratingAvg")}
          value={ratingDisplay}
          hint={ratingHint}
          tint="#f59e0b"
        />
        <StatCard
          icon="radio"
          label={t("dashboard.nearbyRequests")}
          value={data.activeRequestsCount}
          hint={t("dashboard.nearbyRequestsHint")}
          tint={colors.primary}
        />
      </View>

      <Card style={styles.activityCard}>
        <View style={styles.activityRow}>
          <View
            style={[
              styles.iconBubble,
              { backgroundColor: colors.primary + "22" },
            ]}
          >
            <Feather name="clock" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.activityLabel,
                { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" },
              ]}
            >
              {t("dashboard.lastMessage")}
            </Text>
            <Text
              style={[
                styles.activityValue,
                { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
              ]}
            >
              {formatRelative(data.lastMessageAt, i18n.language, t("dashboard.noMessage"))}
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22 },
  headerSubtitle: { fontSize: 13, marginBottom: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    padding: 14,
    gap: 6,
    minHeight: 110,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 12, marginTop: 2 },
  statValue: { fontSize: 22, lineHeight: 26 },
  statHint: { fontSize: 11 },
  activityCard: { padding: 14, marginTop: 4 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activityLabel: { fontSize: 12 },
  activityValue: { fontSize: 16, marginTop: 2 },
  skeletonHeader: { height: 28, width: "60%", borderRadius: 8 },
  skeletonCard: { width: "48%", height: 110, borderRadius: 14 },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  errorText: { fontSize: 16, textAlign: "center", marginTop: 8 },
  retry: { fontSize: 14, marginTop: 4 },
  errorDetail: { fontSize: 11, textAlign: "center", marginTop: 4 },
});
