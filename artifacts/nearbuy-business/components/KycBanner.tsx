import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getGetShopKycStatusQueryOptions,
  type KycStatusResponse,
} from "@workspace/api-client-react";

type Props = { shopId: string };

type Variant = {
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

const VARIANTS: Record<"unsubmitted" | "pending" | "rejected", Variant> = {
  unsubmitted: {
    bg: "#FFF4E5",
    border: "#F58220",
    iconColor: "#F58220",
    textColor: "#7A3A00",
    icon: "alert-triangle",
  },
  pending: {
    bg: "#E6EDFA",
    border: "#1B2A5C",
    iconColor: "#1B2A5C",
    textColor: "#1B2A5C",
    icon: "clock",
  },
  rejected: {
    bg: "#FDECEC",
    border: "#D14343",
    iconColor: "#D14343",
    textColor: "#7A1D1D",
    icon: "x-circle",
  },
};

export function KycBanner({ shopId }: Props) {
  const { t } = useTranslation();
  const { data } = useQuery({
    ...getGetShopKycStatusQueryOptions(shopId),
    refetchInterval: 30_000,
  });

  if (!data) return null;
  const kyc = data as KycStatusResponse;
  if (kyc.status === "approved") return null;

  const v = VARIANTS[kyc.status];
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
    borderRadius: 12,
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
