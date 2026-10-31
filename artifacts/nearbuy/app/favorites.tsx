import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyFavoriteShopsQueryKey, useGetMyFavoriteShops, useSetMyFavoriteShop } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { BrandPhoto } from "@/components/BrandPhoto";

export default function FavoritesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const client = useQueryClient();
  const favorites = useGetMyFavoriteShops({ query: { enabled: !!isSignedIn && !!userId, queryKey: [...getGetMyFavoriteShopsQueryKey(), userId ?? "signed-out"] } });
  const mutation = useSetMyFavoriteShop();
  const remove = async (shopId: string) => {
    try {
      await mutation.mutateAsync({ shopId, data: { favorite: false } });
      await client.invalidateQueries({ queryKey: getGetMyFavoriteShopsQueryKey() });
    } catch { Alert.alert(t("social.saveError")); }
  };
  const open = (shopId: string, kind: string) => router.push((kind === "services" ? `/provider/${shopId}` : `/shop/${shopId}`) as never);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>{t("social.collection")}</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>{t("social.favoritesTitle")}</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t("social.favoritesHint")}</Text>
    {!isSignedIn ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="heart" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("social.signInTitle")}</Text><Button title={t("common.signIn")} onPress={() => router.push("/(auth)/sign-in" as Href)} /></View> :
      favorites.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> :
      favorites.isError ? <View style={styles.center}><Text style={{ color: colors.destructive }}>{t("social.loadError")}</Text><Button title={t("common.retry")} onPress={() => favorites.refetch()} /></View> :
      !favorites.data?.length ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bookmark" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("social.noFavorites")}</Text><Text style={{ color: colors.mutedForeground, textAlign: "center" }}>{t("social.noFavoritesHint")}</Text></View> :
      <View style={{ gap: 10, marginTop: 24 }}>{favorites.data.map((item) => <View key={item.shopId} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={() => open(item.shopId, item.kind)} accessibilityRole="button" accessibilityLabel={t("social.openShop", { name: item.name })} style={styles.shopButton}>
          <BrandPhoto uri={item.brandImageUrl} name={item.name} size={54} style={{ borderRadius: 16 }} />
          <View style={{ flex: 1 }}><Text style={[styles.shopName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{t(item.kind === "services" ? "social.provider" : "social.shop")}</Text></View>
          <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={() => remove(item.shopId)} disabled={mutation.isPending} accessibilityRole="button" accessibilityLabel={t("social.removeFavorite", { name: item.name })} testID={`remove-favorite-${item.shopId}`} style={styles.remove}><Feather name="heart" size={19} color={colors.destructive} /></Pressable>
      </View>)}</View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, flexGrow: 1 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: "800", marginTop: 5, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  row: { minHeight: 78, borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  shopButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  shopName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  remove: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(180,65,75,0.08)" },
  empty: { marginTop: 28, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  center: { alignItems: "center", gap: 14, marginTop: 30 },
});
