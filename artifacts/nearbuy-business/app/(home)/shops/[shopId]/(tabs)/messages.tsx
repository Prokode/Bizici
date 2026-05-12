import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { listConversations, type ConversationSummary } from "@/lib/api/conversations";

function useFormatRelative() {
  const { t, i18n } = useTranslation();
  return React.useCallback(
    (iso: string): string => {
      try {
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return t("common.justNow");
        if (min < 60) return t("common.minAgo", { count: min });
        const hours = Math.floor(min / 60);
        if (hours < 24) return t("common.hAgo", { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 7) return t("common.dAgo", { count: days });
        return d.toLocaleDateString(i18n.language, {
          day: "numeric",
          month: "short",
        });
      } catch {
        return "";
      }
    },
    [t, i18n.language],
  );
}

export default function ShopMessagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const formatRelative = useFormatRelative();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const query = useQuery({
    queryKey: ["chat-conv-list"],
    queryFn: () => listConversations(),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Only this shop's seller-side conversations
  const items =
    query.data?.filter(
      (c) => c.myRole === "seller" && c.shop.id === shopId,
    ) ?? [];

  const renderItem = ({ item }: { item: ConversationSummary }) => {
    const customerName =
      item.customer.name ?? item.customer.email ?? t("messages.customer");
    return (
      <Pressable
        onPress={() =>
          router.push(
            `/(home)/shops/${shopId}/chat/${item.id}` as Href,
          )
        }
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Feather name="user" size={20} color={colors.mutedForeground} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.rowTop}>
            <Text
              numberOfLines={1}
              style={[styles.rowTitle, { color: colors.foreground }]}
            >
              {customerName}
            </Text>
            <Text
              style={[styles.rowTime, { color: colors.mutedForeground }]}
            >
              {formatRelative(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              numberOfLines={1}
              style={[
                styles.rowPreview,
                {
                  color:
                    item.unreadCount > 0
                      ? colors.foreground
                      : colors.mutedForeground,
                  fontWeight: item.unreadCount > 0 ? "700" : "400",
                },
              ]}
            >
              {item.lastMessageText || t("messages.noMessagesYet")}
            </Text>
            {item.unreadCount > 0 && (
              <View
                style={[styles.badge, { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isLoading}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View style={{ paddingVertical: 64, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather
                name="inbox"
                size={32}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                {t("messages.emptyHint")}
              </Text>
            </View>
          )
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  rowTime: { fontSize: 11 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  rowPreview: { flex: 1, fontSize: 13 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  empty: {
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { textAlign: "center", fontSize: 14, lineHeight: 20 },
});
