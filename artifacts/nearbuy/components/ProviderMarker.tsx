import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  servicesCount: number;
  isVerified: boolean;
  isHybrid?: boolean;
};

/**
 * Map marker for service providers (hairdressers, gardeners, plumbers…).
 * Visually distinct from the orange product `ShopMarker`: purple gradient
 * with a scissors icon. A small green check overlays when the provider has
 * been verified by the platform. For hybrid shops we add an amber dot to
 * signal "produits + services".
 */
export function ProviderMarker({
  servicesCount,
  isVerified,
  isHybrid = false,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["#8B5CF6", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bubble}
      >
        <Feather name="scissors" size={16} color="#ffffff" />
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
      </LinearGradient>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
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
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#6366F1",
    marginTop: -2,
  },
});
