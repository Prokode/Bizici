import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface Props {
  latitude: number;
  longitude: number;
}

export function ShopMapPreview({ latitude, longitude }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        { backgroundColor: colors.muted },
      ]}
    >
      <Feather name="map-pin" size={36} color={colors.primary} />
      <Text
        style={[
          styles.coords,
          { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" },
        ]}
      >
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  coords: { marginTop: 8, fontSize: 14, letterSpacing: 0.3 },
});
