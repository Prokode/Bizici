import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import type { PublicShop } from "@/lib/api/shops";
import { LocationBadge } from "@/components/LocationBadge";

type Props = {
  shop: PublicShop;
  onClose: () => void;
  onOpenProfile: () => void;
};

/**
 * Floating card shown when the user taps a service-provider marker on the
 * map. Lighter than the product `ShopBottomSheet` because the focused
 * action is "open the full profile" — not "browse inventory".
 */
export function ProviderBottomCard({ shop, onClose, onOpenProfile }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const provider = shop.serviceProvider;
  const fullName = [provider?.firstName, provider?.lastName]
    .filter(Boolean)
    .join(" ");
  const distanceLabel =
    shop.distanceMeters < 1000
      ? `${shop.distanceMeters} m`
      : `${(shop.distanceMeters / 1000).toFixed(1)} km`;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {provider?.photoUrl ? (
          <Image source={{ uri: provider.photoUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={["#8B5CF6", "#6366F1"]}
            style={styles.avatarFallback}
          >
            <Feather name="scissors" size={22} color="#ffffff" />
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {fullName || shop.name}
            </Text>
            {provider?.isVerified && (
              <Feather name="check-circle" size={16} color="#10b981" />
            )}
          </View>
          <Text
            style={[styles.shopName, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {shop.name}
          </Text>
          <View style={styles.metaRow}>
            <Feather
              name="navigation"
              size={11}
              color={colors.mutedForeground}
            />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {distanceLabel}
            </Text>
            {provider?.serviceRadiusKm != null && (
              <>
                <Text
                  style={[styles.dotSep, { color: colors.mutedForeground }]}
                >
                  ·
                </Text>
                <Feather
                  name="radio"
                  size={11}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {t("provider.radiusKm", {
                    km: provider.serviceRadiusKm,
                  })}
                </Text>
              </>
            )}
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {provider?.serviceLocation && (
        <LocationBadge mode={provider.serviceLocation} colors={colors} t={t} />
      )}

      {provider?.bio && (
        <Text
          style={[styles.bio, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {provider.bio}
        </Text>
      )}

      <Pressable
        onPress={onOpenProfile}
        style={({ pressed }) => [
          styles.cta,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <LinearGradient
          colors={["#8B5CF6", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Feather name="user" size={16} color="#ffffff" />
          <Text style={styles.ctaText}>{t("provider.openProfile")}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "700" },
  shopName: { fontSize: 12, marginTop: 1 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 11 },
  dotSep: { fontSize: 11, marginHorizontal: 2 },
  bio: { fontSize: 13, lineHeight: 18 },
  closeBtn: { padding: 4 },
  cta: { borderRadius: 12, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  ctaText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});
