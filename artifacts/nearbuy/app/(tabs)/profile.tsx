import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser, useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isSignedIn } = useUser();
  const { signOut } = useAuth();

  // Karma points will be wired to /api/me/karma later; show 0 for now.
  const karma = 0;

  if (!isSignedIn) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}
      >
        <View style={styles.signInHero}>
          <LinearGradient
            colors={["#FF6B35", "#FF3D7F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.signInCircle}
          >
            <Feather name="user" size={56} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.signInTitle, { color: colors.foreground }]}>
            Connectez-vous pour gagner du Karma
          </Text>
          <Text style={[styles.signInBody, { color: colors.mutedForeground }]}>
            Confirmez les stocks, diffusez vos demandes et suivez vos boutiques
            préférées.
          </Text>
        </View>
        <View style={{ height: 24 }} />
        <Button
          title="Se connecter"
          fullWidth
          size="lg"
          onPress={() => {
            // TODO: wire Clerk sign-in flow
          }}
          icon={<Feather name="log-in" size={18} color="#ffffff" />}
        />
      </View>
    );
  }

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Utilisateur";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 24 },
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {displayName}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
      </View>

      <LinearGradient
        colors={["#FF6B35", "#FF3D7F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.karmaCard}
      >
        <View style={styles.karmaRow}>
          <Feather name="award" size={28} color="#ffffff" />
          <Text style={styles.karmaLabel}>Karma NearBuy</Text>
        </View>
        <Text style={styles.karmaValue}>{karma}</Text>
        <Text style={styles.karmaHint}>
          Confirmez les stocks pour gagner des points.
        </Text>
      </LinearGradient>

      <Pressable
        onPress={() => signOut()}
        style={[
          styles.signOut,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.foreground} />
        <Text style={[styles.signOutText, { color: colors.foreground }]}>
          Se déconnecter
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  signInHero: { alignItems: "center", marginTop: 24, gap: 16 },
  signInCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  signInTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  signInBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "700" },
  email: { fontSize: 13, marginTop: 4 },
  karmaCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  karmaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  karmaLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  karmaValue: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "800",
    marginTop: 6,
  },
  karmaHint: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontWeight: "600" },
});
