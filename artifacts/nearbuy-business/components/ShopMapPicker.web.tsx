import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface Props {
  latitude: number;
  longitude: number;
  onChange: (coord: { latitude: number; longitude: number }) => void;
}

export function ShopMapPicker({ latitude, longitude, onChange }: Props) {
  const colors = useColors();

  const nudge = (latDelta: number, lngDelta: number) => {
    onChange({
      latitude: latitude + latDelta,
      longitude: longitude + lngDelta,
    });
  };

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        { backgroundColor: colors.muted },
      ]}
    >
      <View style={[styles.gridBackground, { borderColor: colors.border }]}>
        <Feather name="map-pin" size={56} color={colors.primary} />
        <Text
          style={[
            styles.coords,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
        >
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Use the arrows to fine-tune your shop's pin.
        </Text>
        <View style={styles.padContainer}>
          <View style={styles.padRow}>
            <Pressable
              onPress={() => nudge(0.0005, 0)}
              style={[styles.padBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="arrow-up" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.padRow}>
            <Pressable
              onPress={() => nudge(0, -0.0005)}
              style={[styles.padBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <View style={{ width: 56 }} />
            <Pressable
              onPress={() => nudge(0, 0.0005)}
              style={[styles.padBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="arrow-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.padRow}>
            <Pressable
              onPress={() => nudge(-0.0005, 0)}
              style={[styles.padBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="arrow-down" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  gridBackground: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  coords: {
    marginTop: 12,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  hint: { marginTop: 6, marginBottom: 24, fontSize: 13 },
  padContainer: { alignItems: "center" },
  padRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  padBtn: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
});
