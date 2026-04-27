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
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { listConversations, type ConversationSummary } from "@/lib/chatApi";

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function SignedOutHero() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.heroWrap,
        { backgroundColor: colors.background, paddingTop: insets.top + 24 },
      ]}
    >
      <LinearGradient
        colors={["#FF6B35", "#FF3D7F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroIcon}
      >
        <Feather name="message-circle" size={32} color="#ffffff" />
      </LinearGradient>
      <Text style={[styles.heroTitle, { color: colors.foreground }]}>
        Discutez avec les vendeurs
      </Text>
      <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
        Connectez-vous pour poser vos questions à un vendeur, vérifier la
        disponibilité d'un produit ou réserver.
      </Text>
      <View style={styles.heroActions}>
        <Button
          title="Se connecter"
          size="lg"
          onPress={() =>
            router.push(
              `/(auth)/sign-in?next=${encodeURIComponent(
                "/(tabs)/messages",
              )}` as Href,
            )
          }
        />
        <Button
          title="Créer un compte"
          variant="outline"
          size="lg"
          onPress={() =>
            router.push(
              `/(auth)/sign-up?next=${encodeURIComponent(
                "/(tabs)/messages",
              )}` as Href,
            )
          }
        />
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const query = useQuery({
    queryKey: ["chat-conv-list"],
    queryFn: () => listConversations(),
    enabled: !!isSignedIn,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  if (!isLoaded) {
    return (
      <View
        style={[styles.loading, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) return <SignedOutHero />;

  const renderItem = ({ item }: { item: ConversationSummary }) => {
    const otherName =
      item.myRole === "seller"
        ? (item.customer.name ?? item.customer.email ?? "Client")
        : item.shop.name;
    const otherSubtitle =
      item.myRole === "seller"
        ? item.shop.name
        : (item.shop.marketName ?? null);
    return (
      <Pressable
        onPress={() => router.push(`/chat/${item.id}` as Href)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={[styles.avatar, { backgroundColor: colors.muted }]}
        >
          <Feather
            name={item.myRole === "seller" ? "user" : "shopping-bag"}
            size={20}
            color={colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.rowTop}>
            <Text
              numberOfLines={1}
              style={[styles.rowTitle, { color: colors.foreground }]}
            >
              {otherName}
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
              {otherSubtitle && item.lastMessageText
                ? `${otherSubtitle} · ${item.lastMessageText}`
                : (item.lastMessageText ||
                  otherSubtitle ||
                  "Démarrer la conversation")}
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
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>
        Messages
      </Text>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 8,
        }}
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
                Aucune discussion pour l'instant. Ouvrez une fiche boutique sur
                la carte et appuyez sur « Discuter avec le vendeur ».
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
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
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
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  // Hero
  heroWrap: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  heroSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  heroActions: { gap: 12, alignSelf: "stretch" },
});
