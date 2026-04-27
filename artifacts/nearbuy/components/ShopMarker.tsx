import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  productCount: number;
  isOpen: boolean;
};

/**
 * Custom map marker that mirrors the NearBuy pin (gradient orange/coral)
 * and shows the in-stock product count when there is at least one.
 */
export function ShopMarker({ productCount, isOpen }: Props) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={isOpen ? ["#FF6B35", "#FF3D7F"] : ["#9CA3AF", "#6B7280"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bubble}
      >
        <Feather name="shopping-bag" size={16} color="#ffffff" />
        {productCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {productCount > 99 ? "99+" : productCount}
            </Text>
          </View>
        )}
      </LinearGradient>
      <View
        style={[
          styles.tail,
          {
            borderTopColor: isOpen ? "#FF3D7F" : "#6B7280",
          },
        ]}
      />
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
    elevation: 4,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF3D7F",
  },
  badgeText: {
    color: "#FF3D7F",
    fontSize: 10,
    fontWeight: "800",
  },
});
