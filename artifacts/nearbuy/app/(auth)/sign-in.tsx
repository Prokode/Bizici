import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSignIn, useSSO } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    const target =
      typeof next === "string" && next.startsWith("/")
        ? (next as Href)
        : ("/(tabs)/profile" as Href);
    router.replace(target);
  }, [router, next]);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setSubmitError(
          error.errors?.[0]?.longMessage ??
            error.message ??
            t("auth.errorSignIn"),
        );
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) return;
            goHome();
          },
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? t("auth.errorGeneric"));
    }
  };

  /**
   * Single SSO entry point shared by Google + Apple. Provider config in
   * Clerk dashboard + Apple Developer portal + Expo plugin must be done
   * separately — this is UI wiring only.
   */
  const onSSO = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      setSubmitError(null);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });
        if (createdSessionId && setActive) {
          await setActive({
            session: createdSessionId,
            navigate: async ({ session }) => {
              if (session?.currentTask) return;
              goHome();
            },
          });
        }
      } catch (err: any) {
        setSubmitError(
          err?.message ??
            (strategy === "oauth_apple"
              ? t("auth.errorApple")
              : t("auth.errorGoogle")),
        );
      }
    },
    [goHome, startSSOFlow, t],
  );

  const onGoogle = useCallback(() => onSSO("oauth_google"), [onSSO]);
  const onApple = useCallback(() => onSSO("oauth_apple"), [onSSO]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>
            {t("auth.back")}
          </Text>
        </Pressable>

        <View style={styles.header}>
          <LinearGradient
            colors={["#F58220", "#E26A0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Feather name="award" size={28} color="#ffffff" />
          </LinearGradient>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: "PlusJakartaSans_700Bold",
              },
            ]}
          >
            {t("auth.signInTitle")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.mutedForeground,
                fontFamily: "PlusJakartaSans_400Regular",
              },
            ]}
          >
            {t("auth.signInSubtitle")}
          </Text>
        </View>

        <Card style={styles.card}>
          <Button
            title={t("auth.continueGoogle")}
            variant="secondary"
            icon={
              <Feather
                name="chrome"
                size={18}
                color={colors.secondaryForeground}
              />
            }
            onPress={onGoogle}
            style={{ marginBottom: 12 }}
          />
          {/* Apple SSO — iOS/web only (Apple HIG). UI only; provider must be
              enabled in Clerk before it works end-to-end. */}
          {Platform.OS !== "android" && (
            <Button
              title={t("auth.continueApple")}
              icon={<FontAwesome name="apple" size={18} color="#FFFFFF" />}
              onPress={onApple}
              style={{
                backgroundColor: "#000000",
                borderColor: "#000000",
                marginBottom: 16,
              }}
              textStyle={{ color: "#FFFFFF" }}
            />
          )}

          <View style={styles.dividerRow}>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Text
              style={[styles.dividerText, { color: colors.mutedForeground }]}
            >
              {t("common.or")}
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </View>

          <Input
            label={t("auth.email")}
            placeholder={t("auth.emailPlaceholder")}
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors?.fields?.identifier && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.identifier.message}
            </Text>
          )}

          <Input
            label={t("auth.password")}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors?.fields?.password && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.password.message}
            </Text>
          )}
          {submitError && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {submitError}
            </Text>
          )}

          <Button
            title={t("auth.signInButton")}
            size="lg"
            disabled={!emailAddress || !password || fetchStatus === "fetching"}
            loading={fetchStatus === "fetching"}
            onPress={handleSubmit}
            style={{ marginTop: 12 }}
          />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password" as Href)}
            style={{ marginTop: 12, alignSelf: "center" }}
          >
            <Text
              style={[
                styles.link,
                {
                  color: colors.primary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                },
              ]}
            >
              {t("auth.forgotLink")}
            </Text>
          </Pressable>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t("auth.noAccount")}{" "}
          </Text>
          <Link
            href={
              (typeof next === "string" && next.startsWith("/")
                ? `/(auth)/sign-up?next=${encodeURIComponent(next)}`
                : "/(auth)/sign-up") as Href
            }
          >
            <Text
              style={[
                styles.link,
                {
                  color: colors.primary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                },
              ]}
            >
              {t("auth.signUp")}
            </Text>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: "600" },
  header: { alignItems: "center", marginTop: 8, marginBottom: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", paddingHorizontal: 12 },
  card: { padding: 20, marginBottom: 24 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divider: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
  error: { fontSize: 13, marginTop: -8, marginBottom: 8 },
});
