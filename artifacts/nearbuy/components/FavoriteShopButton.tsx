import React, { useMemo } from "react";
import { Alert, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyFavoriteShopsQueryKey, useGetMyFavoriteShops, useSetMyFavoriteShop } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

export function FavoriteShopButton({ shopId, name, compact = false }: { shopId: string; name: string; compact?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const client = useQueryClient();
  const favorites = useGetMyFavoriteShops({ query: { enabled: !!isSignedIn && !!userId, queryKey: [...getGetMyFavoriteShopsQueryKey(), userId ?? "signed-out"] } });
  const setFavorite = useSetMyFavoriteShop();
  const favorite = useMemo(() => favorites.data?.some((item) => item.shopId === shopId) ?? false, [favorites.data, shopId]);
  const toggle = async () => {
    if (!isSignedIn) {
      router.push("/(auth)/sign-in" as Href);
      return;
    }
    try {
      await setFavorite.mutateAsync({ shopId, data: { favorite: !favorite } });
      await client.invalidateQueries({ queryKey: getGetMyFavoriteShopsQueryKey() });
    } catch {
      Alert.alert(t("social.saveError"));
    }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={favorite ? t("social.removeFavorite", { name }) : t("social.addFavorite", { name })} accessibilityState={{ selected: favorite, disabled: setFavorite.isPending }} disabled={setFavorite.isPending} onPress={toggle} testID={`favorite-${shopId}`} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: compact ? 10 : 14, borderRadius: 14, backgroundColor: colors.muted, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: setFavorite.isPending ? 0.55 : 1 }}>
      <Feather name={favorite ? "heart" : "heart"} size={18} color={favorite ? colors.destructive : colors.foreground} />
      {!compact && <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{t(favorite ? "social.saved" : "social.save")}</Text>}
    </Pressable>
  );
}
