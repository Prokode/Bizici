import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { getOrCreateConversation } from "@/lib/api/conversations";
import { chatStartFailure, type ChatStartFailure } from "@/lib/chatStartError";
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
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [failed, setFailed] = useState<ChatStartFailure | null>(null);
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
    setFailed(null);
    (async () => {
      try {
        // Do not depend on the root token bridge's effect having run first.
        const token = await getToken();
        if (cancelled) return;
        if (!token) {
          setFailed({ reason: "session", retryable: true });
          return;
        }
        const conv = await getOrCreateConversation(shopId, token);
        if (cancelled) return;
        router.replace(chatThreadHref(conv.id, ctx) as Href);
      } catch (error) {
        if (!cancelled) setFailed(chatStartFailure(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId, ctx, isSignedIn, isLoaded, getToken, router, attempt]);

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
          {shopId && failed ? t(`askItem.failures.${failed.reason}`) : t("askItem.invalidLink")}
        </Text>
        {failed?.status ? (
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            HTTP {failed.status}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {shopId && failed?.retryable ? (
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
