import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  productCount: number;
  isOpen: boolean;
};

/**
 * Orange initial marker with a separate open/closed indicator.
 * Fixed bounds keep the complete pin inside Android's marker snapshot.
 */
export function ShopMarker({ name, productCount, isOpen }: Props) {
  return (
    <View style={styles.wrapper} collapsable={false}>
      <View
        style={styles.bubble}
      >
        <Text style={styles.initial} allowFontScaling={false}>
          {Array.from(name.trim())[0]?.toLocaleUpperCase() || "?"}
        </Text>
        <View style={[styles.openDot, { backgroundColor: isOpen ? "#16A34A" : "#6B7280" }]} />
        {productCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {productCount > 99 ? "99+" : productCount}
            </Text>
          </View>
        )}
      </View>
      <View
        style={[
          styles.tail,
          {
            borderTopColor: "#E26A0A",
          },
        ]}
      />
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
  openDot: { position: "absolute", bottom: -3, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#ffffff" },
  bubble: {
    backgroundColor: "#E26A0A",
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
    elevation: 4,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
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
    borderColor: "#F58220",
  },
  badgeText: {
    color: "#F58220",
    fontSize: 10,
    fontWeight: "800",
  },
});
