import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import {
  getGetShopKycStatusQueryOptions,
  type KycStatusResponse,
} from "@workspace/api-client-react";

type Props = { shopId: string };
// Match the API launch policy; restore alongside its KYC enforcement flag.
export const KYC_ENFORCEMENT_ENABLED: boolean = false;

type Variant = {
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

export function KycBanner({ shopId }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { data } = useQuery({
    ...getGetShopKycStatusQueryOptions(shopId),
    enabled: KYC_ENFORCEMENT_ENABLED,
    refetchInterval: 30_000,
  });

  if (!KYC_ENFORCEMENT_ENABLED || !data) return null;
  const kyc = data as KycStatusResponse;
  if (kyc.status === "approved") return null;

  const v: Variant = kyc.status === "unsubmitted"
    ? {
        bg: colors.warning,
        border: colors.warning,
        iconColor: colors.warningForeground,
        textColor: colors.warningForeground,
        icon: "alert-triangle",
      }
    : kyc.status === "pending"
      ? {
          bg: colors.accent,
          border: colors.border,
          iconColor: colors.accentForeground,
          textColor: colors.accentForeground,
          icon: "clock",
        }
      : {
          bg: colors.destructive + "18",
          border: colors.destructive,
          iconColor: colors.destructive,
          textColor: colors.destructive,
          icon: "x-circle",
        };
  const title = t(`kyc.banner.${kyc.status}.title`);
  const subtitle =
    kyc.status === "rejected" && kyc.rejectionReason
      ? t("kyc.banner.rejected.reason", { reason: kyc.rejectionReason })
      : t(`kyc.banner.${kyc.status}.subtitle`);
  const cta =
    kyc.status === "pending" ? null : t(`kyc.banner.${kyc.status}.cta`);

  const onPress = () => {
    if (kyc.status === "pending") return;
    router.push(`/(home)/shops/${shopId}/kyc-submit`);
  };

  return (
    <TouchableOpacity
      activeOpacity={kyc.status === "pending" ? 1 : 0.85}
      onPress={onPress}
      style={[styles.container, { backgroundColor: v.bg, borderColor: v.border }]}
    >
      <View style={[styles.iconBubble, { backgroundColor: v.border + "22" }]}>
        <Feather name={v.icon} size={20} color={v.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.title,
            { color: v.textColor, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: v.textColor, fontFamily: "PlusJakartaSans_400Regular" },
          ]}
        >
          {subtitle}
        </Text>
        {cta ? (
          <Text
            style={[
              styles.cta,
              { color: v.iconColor, fontFamily: "PlusJakartaSans_700Bold" },
            ]}
          >
            {cta} →
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, marginBottom: 2 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  cta: { fontSize: 13, marginTop: 6 },
});
