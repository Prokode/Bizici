import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { getOrCreateConversation } from "@/lib/api/conversations";
import {
  chatShopHref,
  chatThreadHref,
  isValidRouteId,
  parseItemContext,
} from "@/lib/chatItemContext";

/**
 * Resolver: ensures a conversation exists for the current user and shop, then
 * replaces itself with /chat/[conversationId], forwarding the optional
 * selected product/service context.
 */
export default function ChatShopResolver() {
  const params = useLocalSearchParams<{
    shopId: string;
    itemKind?: string;
    itemId?: string;
    itemName?: string;
  }>();
  const shopId = isValidRouteId(params.shopId) ? params.shopId : null;
  const ctxKind = params.itemKind;
  const ctxId = params.itemId;
  const ctxName = params.itemName;
  const ctx = useMemo(
    () => parseItemContext({ itemKind: ctxKind, itemId: ctxId, itemName: ctxName }),
    [ctxKind, ctxId, ctxName],
  );
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded || !shopId) return;
    if (!isSignedIn) {
      router.replace(
        `/(auth)/sign-in?next=${encodeURIComponent(chatShopHref(shopId, ctx))}` as Href,
      );
      return;
    }
    let cancelled = false;
    setFailed(false);
    (async () => {
      try {
        const conv = await getOrCreateConversation(shopId);
        if (cancelled) return;
        router.replace(chatThreadHref(conv.id, ctx) as Href);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId, ctx, isSignedIn, isLoaded, router, attempt]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/messages" as Href);

  if (!shopId || failed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("askItem.errorTitle")}
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {shopId ? t("askItem.errorBody") : t("askItem.invalidLink")}
        </Text>
        <View style={styles.actions}>
          {shopId ? (
            <Button title={t("common.retry")} onPress={() => setAttempt((a) => a + 1)} />
          ) : null}
          <Button title={t("common.back")} variant="outline" onPress={goBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {t("askItem.opening")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  label: { fontSize: 14, textAlign: "center" },
  actions: { gap: 10, alignSelf: "stretch", marginTop: 8 },
});
