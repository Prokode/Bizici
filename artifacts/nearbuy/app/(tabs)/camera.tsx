import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";

export default function CameraTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 24 },
      ]}
    >
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={["#A855F7", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCircle}
        >
          <Feather name="camera" size={72} color="#ffffff" />
        </LinearGradient>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        Recherche visuelle
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        Photographiez un objet et nous trouverons des produits similaires en
        stock dans les boutiques autour de vous.
      </Text>

      <View style={{ height: 28 }} />

      <Button
        title="Prendre une photo"
        size="lg"
        fullWidth
        onPress={() => {
          // TODO: launch expo-camera capture flow
        }}
        icon={<Feather name="camera" size={20} color="#ffffff" />}
      />
      <View style={{ height: 12 }} />
      <Button
        title="Choisir dans la galerie"
        size="lg"
        variant="outline"
        fullWidth
        onPress={() => {
          // TODO: launch expo-image-picker
        }}
        icon={<Feather name="image" size={20} color={colors.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  heroWrap: { alignItems: "center", marginTop: 24, marginBottom: 28 },
  heroCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
