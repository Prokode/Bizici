import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type Mode = "at_shop" | "at_customer" | "both";

type Props = {
  mode: Mode;
  colors: {
    primary: string;
    muted: string;
    border: string;
    foreground: string;
    mutedForeground: string;
  };
  t: (k: string) => string;
  size?: "sm" | "md";
};

/**
 * Compact pill that surfaces where a service is performed:
 *   - at_shop      → "Sur place"
 *   - at_customer  → "Vient chez vous"
 *   - both         → "Sur place ou chez vous"
 *
 * Used by the provider screen, the bottom card, and the appointment card so
 * the customer always understands the execution context before booking.
 */
export function LocationBadge({ mode, colors, t, size = "sm" }: Props) {
  const icon =
    mode === "at_customer"
      ? "home"
      : mode === "both"
        ? "shuffle"
        : "shopping-bag";
  const label =
    mode === "at_customer"
      ? t("serviceLocation.badgeAtCustomer")
      : mode === "both"
        ? t("serviceLocation.badgeBoth")
        : t("serviceLocation.badgeAtShop");
  const padV = size === "md" ? 6 : 4;
  const padH = size === "md" ? 10 : 8;
  const fontSize = size === "md" ? 13 : 12;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: padV,
        paddingHorizontal: padH,
        borderRadius: 999,
        backgroundColor: colors.muted,
        borderWidth: 1,
        borderColor: colors.border,
        alignSelf: "flex-start",
      }}
    >
      <Feather name={icon as never} size={fontSize} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontSize, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

type FulfillmentMode = "pickup_only" | "delivery_only" | "both";

type FulfillmentProps = {
  mode: FulfillmentMode;
  deliveryRadiusKm?: number | null;
  colors: Props["colors"];
  t: (k: string, o?: Record<string, unknown>) => string;
  size?: "sm" | "md";
};

/**
 * Sister badge for product shops: explains how the customer can pick up the
 * goods (in person, delivered, or both).
 */
export function FulfillmentBadge({
  mode,
  deliveryRadiusKm,
  colors,
  t,
  size = "sm",
}: FulfillmentProps) {
  const icon =
    mode === "delivery_only"
      ? "truck"
      : mode === "both"
        ? "shuffle"
        : "shopping-bag";
  let label: string;
  if (mode === "delivery_only") {
    label =
      deliveryRadiusKm != null
        ? t("fulfillment.badgeDeliveryWithRadius", { km: deliveryRadiusKm })
        : t("fulfillment.badgeDelivery");
  } else if (mode === "both") {
    label =
      deliveryRadiusKm != null
        ? t("fulfillment.badgeBothWithRadius", { km: deliveryRadiusKm })
        : t("fulfillment.badgeBoth");
  } else {
    label = t("fulfillment.badgePickup");
  }
  const padV = size === "md" ? 6 : 4;
  const padH = size === "md" ? 10 : 8;
  const fontSize = size === "md" ? 13 : 12;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: padV,
        paddingHorizontal: padH,
        borderRadius: 999,
        backgroundColor: colors.muted,
        borderWidth: 1,
        borderColor: colors.border,
        alignSelf: "flex-start",
      }}
    >
      <Feather name={icon as never} size={fontSize} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontSize, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}
