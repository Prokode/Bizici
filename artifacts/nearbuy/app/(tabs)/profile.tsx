import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser, useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { fetchMyKarma, type KarmaEvent } from "@/lib/publicApi";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ONBOARDING_SEEN_KEY } from "@/app/onboarding";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const KARMA_ICONS: Record<KarmaEvent["kind"], React.ComponentProps<typeof Feather>["name"]> = {
  welcome: "gift",
  stock_confirmation: "check-circle",
  stock_report: "alert-circle",
  broadcast: "radio",
};

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { signOut, getToken } = useAuth();
  const { t, i18n } = useTranslation();

  const formatRelative = React.useCallback(
    (iso: string): string => {
      const then = new Date(iso).getTime();
      const now = Date.now();
      const seconds = Math.max(1, Math.round((now - then) / 1000));
      if (seconds < 60) return t("common.justNow");
      const minutes = Math.round(seconds / 60);
      if (minutes < 60) return t("common.minAgo", { count: minutes });
      const hours = Math.round(minutes / 60);
      if (hours < 24) return t("common.hAgo", { count: hours });
      const days = Math.round(hours / 24);
      if (days < 30) return t("common.dAgo", { count: days });
      return new Date(iso).toLocaleDateString(
        i18n.language === "en" ? "en-US" : "fr-FR",
      );
    },
    [t, i18n.language],
  );

  const karmaQuery = useQuery({
    queryKey: ["karma", user?.id],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      return fetchMyKarma(API_BASE, token);
    },
  });

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
            colors={["#F58220", "#E26A0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.signInCircle}
          >
            <Feather name="user" size={56} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.signInTitle, { color: colors.foreground }]}>
            {t("profile.signInTitle")}
          </Text>
          <Text style={[styles.signInBody, { color: colors.mutedForeground }]}>
            {t("profile.signInBody")}
          </Text>
        </View>
        <View style={{ height: 24 }} />
        <Button
          title={t("common.signIn")}
          fullWidth
          size="lg"
          onPress={() => router.push("/(auth)/sign-in" as Href)}
          icon={<Feather name="log-in" size={18} color="#ffffff" />}
        />
        <Pressable
          onPress={() => router.push("/(auth)/sign-up" as Href)}
          style={styles.createLink}
        >
          <Text style={[styles.createLinkText, { color: colors.primary }]}>
            {t("profile.createWithBonus")}
          </Text>
        </Pressable>
      </View>
    );
  }

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    t("profile.user");

  const points = karmaQuery.data?.points ?? null;
  const events = karmaQuery.data?.recentEvents ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: 32 },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
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
        colors={["#F58220", "#E26A0A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.karmaCard}
      >
        <View style={styles.karmaRow}>
          <Feather name="award" size={28} color="#ffffff" />
          <Text style={styles.karmaLabel}>{t("profile.karmaTitle")}</Text>
        </View>
        {karmaQuery.isLoading ? (
          <ActivityIndicator
            color="#ffffff"
            size="large"
            style={{ marginTop: 8 }}
          />
        ) : karmaQuery.isError ? (
          <Text style={styles.karmaError}>
            {t("profile.karmaError")}
          </Text>
        ) : (
          <Text style={styles.karmaValue}>{points ?? 0}</Text>
        )}
        <Text style={styles.karmaHint}>
          {t("profile.karmaHint")}
        </Text>
      </LinearGradient>

      {events.length > 0 && (
        <View
          style={[
            styles.historyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.historyTitle, { color: colors.foreground }]}>
            {t("profile.recentActivity")}
          </Text>
          {events.map((evt) => (
            <View key={evt.id} style={styles.historyRow}>
              <View
                style={[
                  styles.historyIcon,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather
                  name={KARMA_ICONS[evt.kind]}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.historyLabel,
                    { color: colors.foreground },
                  ]}
                >
                  {evt.note ?? t(`profile.karma.${evt.kind}` as const)}
                </Text>
                <Text
                  style={[
                    styles.historyMeta,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {formatRelative(evt.createdAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyPoints,
                  {
                    color:
                      evt.points >= 0 ? colors.primary : colors.destructive,
                  },
                ]}
              >
                {evt.points >= 0 ? `+${evt.points}` : evt.points}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push("/course" as Href)}
        style={[
          styles.courseEntry,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <LinearGradient
          colors={["#F58220", "#E26A0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.courseIcon}
        >
          <Feather name="shopping-bag" size={22} color="#ffffff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.courseTitle, { color: colors.foreground }]}>
            {t("course.entry")}
          </Text>
          <Text
            style={[styles.courseHint, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {t("course.entryHint")}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>

      <View style={{ marginBottom: 16 }}>
        <LanguageSwitcher />
      </View>

      <Pressable
        onPress={async () => {
          try {
            await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY);
          } catch {
            // ignore
          }
          router.push("/onboarding" as Href);
        }}
        style={[
          styles.replayEntry,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[styles.replayIcon, { backgroundColor: colors.muted }]}
        >
          <Feather name="play-circle" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.replayTitle, { color: colors.foreground }]}>
            {t("onboarding.replay")}
          </Text>
          <Text
            style={[styles.replayHint, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {t("onboarding.replayHint")}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>

      <Pressable
        onPress={() => signOut()}
        style={[
          styles.signOut,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.foreground} />
        <Text style={[styles.signOutText, { color: colors.foreground }]}>
          {t("common.signOut")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
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
  createLink: { alignItems: "center", paddingVertical: 16 },
  createLinkText: { fontSize: 15, fontWeight: "600" },
  courseEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  courseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  courseTitle: { fontSize: 15, fontWeight: "700" },
  courseHint: { fontSize: 13, marginTop: 2 },
  replayEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  replayIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  replayTitle: { fontSize: 15, fontWeight: "700" },
  replayHint: { fontSize: 13, marginTop: 2 },
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
  karmaError: {
    color: "#ffffff",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
  },
  historyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  historyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  historyLabel: { fontSize: 14, fontWeight: "600" },
  historyMeta: { fontSize: 12, marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: "800" },
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
