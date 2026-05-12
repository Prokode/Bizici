import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import { getOrCreateConversation } from "@/lib/api/conversations";

/**
 * Resolver screen used after a deep-link from sign-in.
 * Takes a shopId, ensures a conversation exists for the current user, then
 * replaces itself with /chat/[conversationId].
 */
export default function ChatShopResolver() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !shopId) return;
    if (!isSignedIn) {
      router.replace(
        `/(auth)/sign-in?next=${encodeURIComponent(
          `/chat-shop/${shopId}`,
        )}` as Href,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const conv = await getOrCreateConversation(shopId);
        if (cancelled) return;
        router.replace(`/chat/${conv.id}` as Href);
      } catch {
        if (cancelled) return;
        router.replace("/(tabs)/messages" as Href);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId, isSignedIn, isLoaded, router]);

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Ouverture de la discussion…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  label: { fontSize: 14 },
});
