import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  name: string;
  servicesCount: number;
  isVerified: boolean;
  isHybrid?: boolean;
};

/**
 * Map marker for service providers (hairdressers, gardeners, plumbers…).
 * Visually distinct from the orange product `ShopMarker`: purple initial.
 * A small green check overlays when the provider has
 * been verified by the platform. For hybrid shops we add an amber dot to
 * signal "produits + services".
 */
export function ProviderMarker({
  name,
  servicesCount,
  isVerified,
  isHybrid = false,
}: Props) {
  return (
    <View style={styles.wrapper} collapsable={false}>
      <View
        style={styles.bubble}
      >
        <Text style={styles.initial} allowFontScaling={false}>
          {Array.from(name.trim())[0]?.toLocaleUpperCase() || "?"}
        </Text>
        {servicesCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {servicesCount > 99 ? "99+" : servicesCount}
            </Text>
          </View>
        )}
        {isVerified && (
          <View style={styles.verifiedDot}>
            <Feather name="check" size={8} color="#ffffff" />
          </View>
        )}
        {isHybrid && <View style={styles.hybridDot} />}
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 72,
    height: 76,
    paddingTop: 10,
    alignItems: "center",
  },
  initial: { color: "#ffffff", fontSize: 26, lineHeight: 32, fontWeight: "800", textAlign: "center" },
  bubble: {
    backgroundColor: "#7C3AED",
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
  },
  verifiedDot: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  hybridDot: {
    position: "absolute",
    bottom: -4,
    left: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F59E0B",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#7C3AED",
    marginTop: -2,
  },
});
