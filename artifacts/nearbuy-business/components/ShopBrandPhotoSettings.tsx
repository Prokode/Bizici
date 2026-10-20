import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getGetShopQueryKey, getListShopsQueryKey, type Shop } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BrandPhoto } from "@/components/BrandPhoto";
import { chooseAndUploadShopBrandPhoto, removeShopBrandPhoto } from "@/lib/shopBrandPhoto";

type Props = { shopId: string; name: string; brandPhotoUrl?: string | null };
type Pending = "upload" | "remove" | null;

export function ShopBrandPhotoSettings({ shopId, name, brandPhotoUrl }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  const applyShop = async (updated: Shop) => {
    queryClient.setQueryData(getGetShopQueryKey(shopId), updated);
    // Roles list holds { shop, role } entries; patch the matching shop in place.
    queryClient.setQueryData(getListShopsQueryKey(), (old: unknown) =>
      Array.isArray(old)
        ? old.map((e: { shop?: { id?: string } }) => (e?.shop?.id === shopId ? { ...e, shop: { ...e.shop, ...updated } } : e))
        : old,
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetShopQueryKey(shopId) }),
      queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() }),
    ]);
  };

  const handleChoose = async () => {
    if (pending) return;
    setError(null);
    setPending("upload");
    try {
      const updated = await chooseAndUploadShopBrandPhoto(shopId);
      if (updated) await applyShop(updated);
    } catch {
      setError(t("shopBrandPhoto.uploadError"));
    } finally {
      setPending(null);
    }
  };

  const doRemove = async () => {
    setError(null);
    setPending("remove");
    try {
      const updated = await removeShopBrandPhoto(shopId);
      await applyShop(updated);
    } catch {
      setError(t("shopBrandPhoto.removeError"));
    } finally {
      setPending(null);
    }
  };

  const handleRemove = () => {
    if (pending) return;
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(`${t("shopBrandPhoto.removeConfirmTitle")}\n${t("shopBrandPhoto.removeConfirmBody")}`);
      if (ok) void doRemove();
      return;
    }
    Alert.alert(t("shopBrandPhoto.removeConfirmTitle"), t("shopBrandPhoto.removeConfirmBody"), [
      { text: t("shopBrandPhoto.cancel"), style: "cancel" },
      { text: t("shopBrandPhoto.removeConfirm"), style: "destructive", onPress: () => void doRemove() },
    ]);
  };

  const hasPhoto = !!brandPhotoUrl;
  const busy = pending !== null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ opacity: busy ? 0.5 : 1 }}>
          <BrandPhoto uri={brandPhotoUrl} name={name} size={72} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t("shopBrandPhoto.title")}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t("shopBrandPhoto.subtitle")}</Text>
        </View>
      </View>
      {busy && (
        <Text accessibilityLiveRegion="polite" style={[styles.sub, { color: colors.mutedForeground }]}>
          {t(pending === "upload" ? "shopBrandPhoto.uploading" : "shopBrandPhoto.removing")}
        </Text>
      )}
      <View style={styles.actions}>
        <Button
          title={t(hasPhoto ? "shopBrandPhoto.replace" : "shopBrandPhoto.choose")}
          variant="secondary"
          loading={pending === "upload"}
          disabled={busy}
          icon={<Feather name="image" size={16} color={colors.secondaryForeground} />}
          style={styles.btn}
          onPress={handleChoose}
        />
        {hasPhoto && (
          <Button
            title={t("shopBrandPhoto.remove")}
            variant="ghost"
            loading={pending === "remove"}
            disabled={busy}
            icon={<Feather name="trash-2" size={16} color={colors.destructive} />}
            style={styles.btn}
            onPress={handleRemove}
          />
        )}
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  sub: { fontSize: 13, marginTop: 2, fontFamily: "PlusJakartaSans_400Regular" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  btn: { flexGrow: 1, flexBasis: 140, minHeight: 44 },
});
