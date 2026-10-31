import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyNotificationsQueryKey,
  useGetMyNotifications,
  useReadAllMyNotifications,
  useReadMyNotification,
} from "@workspace/api-client-react";
import type { AppNotification } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";

export default function NotificationsScreen() {
  const { isSignedIn, userId } = useAuth();
  return <NotificationsContent key={userId ?? "signed-out"} isSignedIn={!!isSignedIn} userId={userId ?? null} />;
}

function NotificationsContent({ isSignedIn, userId }: { isSignedIn: boolean; userId: string | null }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const [cursor, setCursor] = useState<string | undefined>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const latestKey = [...getGetMyNotificationsQueryKey(), userId ?? "signed-out"];
  const latestQuery = useGetMyNotifications(undefined, {
    query: {
      enabled: isSignedIn && !!userId,
      queryKey: latestKey,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    },
  });
  const olderParams = cursor ? { before: cursor } : undefined;
  const olderQuery = useGetMyNotifications(olderParams, {
    query: {
      enabled: isSignedIn && !!userId && !!cursor,
      queryKey: [...getGetMyNotificationsQueryKey(olderParams), userId ?? "signed-out"],
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
  });
  const readOne = useReadMyNotification();
  const readAll = useReadAllMyNotifications();

  useFocusEffect(useCallback(() => {
    if (!isSignedIn || !userId) return;
    void latestQuery.refetch();
    if (cursor) void olderQuery.refetch();
  }, [cursor, isSignedIn, latestQuery.refetch, olderQuery.refetch, userId]));

  const mergeItems = useCallback((incoming: AppNotification[]) => {
    setItems((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      incoming.forEach((item) => {
        const existing = merged.get(item.id);
        merged.set(item.id, {
          ...existing,
          ...item,
          // Read state is monotonic; a stale paginated response must not un-read a row.
          readAt: existing?.readAt ?? item.readAt,
        });
      });
      return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }, []);

  useEffect(() => {
    if (latestQuery.data) mergeItems(latestQuery.data.items);
  }, [latestQuery.data, mergeItems]);
  useEffect(() => {
    if (olderQuery.data) mergeItems(olderQuery.data.items);
  }, [olderQuery.data, mergeItems]);

  const refreshAll = () => client.invalidateQueries({ queryKey: getGetMyNotificationsQueryKey() });
  const markOne = async (id: string) => {
    const wasUnread = items.some((item) => item.id === id && !item.readAt);
    try {
      await readOne.mutateAsync({ notificationId: id });
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? readAt } : item));
      client.setQueryData(latestKey, (old: typeof latestQuery.data) => old ? {
        ...old,
        unreadCount: Math.max(0, old.unreadCount - (wasUnread ? 1 : 0)),
        items: old.items.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? readAt } : item),
      } : old);
      await refreshAll();
    } catch {
      Alert.alert(t("social.saveError"));
    }
  };
  const markAll = async () => {
    try {
      await readAll.mutateAsync();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      client.setQueryData(latestKey, (old: typeof latestQuery.data) => old ? { ...old, unreadCount: 0, items: old.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })) } : old);
      await refreshAll();
    } catch {
      Alert.alert(t("social.saveError"));
    }
  };
  const open = async (item: AppNotification) => {
    if (!item.readAt) await markOne(item.id);
    if (item.type === "chat_message" && item.conversationId) router.push(`/chat/${item.conversationId}` as never);
    else if (item.itemKind === "service") router.push(`/provider/${item.shopId}` as never);
    else router.push(`/shop/${item.shopId}` as never);
  };
  const relative = (date: string) => {
    const delta = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return t("common.justNow");
    if (minutes < 60) return t("common.minAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("common.hAgo", { count: hours });
    return new Date(date).toLocaleDateString(i18n.language.startsWith("fr") ? "fr-FR" : "en-US");
  };
  const unread = latestQuery.data?.unreadCount ?? 0;
  const nextCursor = cursor ? olderQuery.data?.nextCursor : latestQuery.data?.nextCursor;
  const loadingLatest = isSignedIn && latestQuery.isLoading;
  const latestError = isSignedIn && latestQuery.isError;
  const olderError = !!cursor && olderQuery.isError;

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t("social.activity")}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t("social.notificationsTitle")}</Text></View>
        {unread > 0 && isSignedIn && <Pressable onPress={markAll} disabled={readAll.isPending} accessibilityRole="button" accessibilityLabel={t("social.markAllRead")} style={styles.markAll}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{t("social.markAllRead")}</Text></Pressable>}
      </View>
      {!isSignedIn ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bell" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("social.signInTitle")}</Text><Button title={t("common.signIn")} onPress={() => router.push("/(auth)/sign-in" as Href)} /></View> :
       loadingLatest ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> :
       latestError && !items.length ? <View style={styles.empty}><Text style={{ color: colors.destructive }}>{t("social.loadError")}</Text><Button title={t("common.retry")} onPress={() => latestQuery.refetch()} /></View> :
       items.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bell" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("social.noNotifications")}</Text><Text style={{ color: colors.mutedForeground, textAlign: "center" }}>{t("social.noNotificationsHint")}</Text></View> :
       <View style={{ gap: 10, marginTop: 20 }}>{items.map((item) => <Pressable key={item.id} onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}`} testID={`notification-${item.id}`} style={({ pressed }) => [styles.item, { backgroundColor: item.readAt ? colors.card : colors.accent, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}>
         <View style={[styles.icon, { backgroundColor: item.readAt ? colors.muted : colors.primary }]}><Feather name={item.type === "chat_message" ? "message-circle" : "package"} size={18} color={item.readAt ? colors.primary : colors.primaryForeground} /></View>
         <View style={{ flex: 1, gap: 4 }}><View style={styles.titleRow}><Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>{!item.readAt && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}</View><Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{relative(item.createdAt)}</Text></View>
         {!item.readAt && <Pressable onPress={(event) => { event.stopPropagation(); void markOne(item.id); }} accessibilityRole="button" accessibilityLabel={t("social.markRead")} hitSlop={10} style={styles.readButton}><Feather name="check" size={17} color={colors.primary} /></Pressable>}
       </Pressable>)}
       {!!nextCursor && <Button title={t("social.loadOlder")} variant="outline" loading={olderQuery.isFetching} disabled={olderQuery.isFetching} onPress={() => { if (!cursor) setCursor(latestQuery.data?.nextCursor ?? undefined); else setCursor(olderQuery.data?.nextCursor ?? undefined); }} />}
       {(latestError || olderError) && <View style={styles.retryRow}><Text style={{ color: colors.destructive, textAlign: "center", flex: 1 }}>{t("social.loadError")}</Text><Pressable onPress={() => { if (olderError) void olderQuery.refetch(); else void latestQuery.refetch(); }} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: "700" }}>{t("common.retry")}</Text></Pressable></View>}
       </View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, flexGrow: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { fontSize: 29, fontWeight: "800", marginTop: 5, letterSpacing: -0.5 },
  markAll: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  item: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  itemTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  body: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 2 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  readButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  empty: { marginTop: 28, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  retryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
});
