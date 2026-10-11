import React, { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useUser, useClerk } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ONBOARDING_SEEN_KEY } from "@/app/onboarding";

export default function UserProfileScreen() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || user?.username || email || t("userProfile.account");

  const signOut = async () => {
    setBusy(true);
    setError(false);
    try {
      await clerk.signOut();
      queryClient.clear();
      router.replace("/(auth)/sign-in");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.foreground }}>{t("common.loading")}</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} testID="user-profile">
      <View style={styles.hero}>
        {user?.imageUrl ? <Image source={{ uri: user.imageUrl }} style={styles.avatar} /> : <Feather name="user" size={48} color={colors.primary} />}
        <Text style={[styles.title, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t("userProfile.description")}</Text>
      </View>
      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("userProfile.name")}</Text>
        <Text selectable style={[styles.value, { color: colors.foreground }]}>{user?.fullName || user?.username || t("profile.notSpecified")}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("userProfile.email")}</Text>
        <Text selectable style={[styles.value, { color: colors.foreground }]}>{email || t("profile.notSpecified")}</Text>
        {user?.primaryPhoneNumber?.phoneNumber ? <><Text style={[styles.label, { color: colors.mutedForeground }]}>{t("userProfile.phone")}</Text><Text selectable style={[styles.value, { color: colors.foreground }]}>{user.primaryPhoneNumber.phoneNumber}</Text></> : null}
      </Card>
      <Button title={t("security.open")} variant="secondary" icon={<Feather name="lock" size={18} color={colors.foreground} />} onPress={() => router.push("/account-security")} testID="security-open" />
      <View style={styles.language}><LanguageSwitcher /></View>
      <Button title={t("onboarding.replay")} variant="ghost" icon={<Feather name="play-circle" size={18} color={colors.primary} />} onPress={async () => {
        try { await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY); router.push("/onboarding"); } catch { setError(true); }
      }} />
      <Button title={t("shopList.myShops")} variant="ghost" icon={<Feather name="shopping-bag" size={18} color={colors.foreground} />} onPress={() => router.replace("/(home)")} />
      {error && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{t("common.error")}</Text>}
      <Button title={t("common.signOut")} variant="ghost" icon={<Feather name="log-out" size={18} color={colors.destructive} />} textStyle={{ color: colors.destructive }} onPress={signOut} loading={busy} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  content: { padding: 20, gap: 12 },
  hero: { alignItems: "center", gap: 12, paddingVertical: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  title: { fontSize: 24, textAlign: "center", fontFamily: "PlusJakartaSans_700Bold" },
  subtitle: { fontSize: 14, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular" },
  card: { padding: 18, gap: 8 },
  label: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  value: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 8 },
  language: { marginVertical: 12 },
});
