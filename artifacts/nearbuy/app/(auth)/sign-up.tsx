import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSignUp, useSSO } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LEGAL_VERSION } from "@workspace/legal-content";
import { recordConsent, type ConsentSource } from "@/lib/api/consent";
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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const requireTermsOrAlert = () => {
    if (acceptedTerms) return true;
    Alert.alert(t("auth.termsRequiredTitle"), t("auth.termsRequiredBody"));
    return false;
  };

  const goHome = useCallback(() => {
    const target =
      typeof next === "string" && next.startsWith("/")
        ? (next as Href)
        : ("/(tabs)/profile" as Href);
    router.replace(target);
  }, [router, next]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!requireTermsOrAlert()) return;
    try {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) {
        setSubmitError(
          error.errors?.[0]?.longMessage ??
            error.message ??
            t("auth.errorSignUp"),
        );
        return;
      }
      await signUp.verifications.sendEmailCode();
    } catch (err: any) {
      setSubmitError(err?.message ?? t("auth.errorGeneric"));
    }
  };

  const handleVerify = async () => {
    setSubmitError(null);
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) return;
            // Audit-trail the consent. Fire-and-forget — must NOT block
            // navigation if the API is briefly unreachable.
            void recordConsent({ version: LEGAL_VERSION, source: "email" });
            goHome();
          },
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? t("auth.errorVerify"));
    }
  };

  /**
   * Single SSO entry point shared by Google + Apple. The strategy decides
   * which OAuth provider Clerk talks to. The provider must be enabled in
   * the Clerk dashboard (and, for Apple, configured in the Apple Developer
   * portal + Expo plugin) — that wiring is intentionally out of scope for
   * this UI-only change.
   */
  const onSSO = useCallback(
    async (strategy: "oauth_google" | "oauth_apple", source: ConsentSource) => {
      setSubmitError(null);
      if (!acceptedTerms) {
        Alert.alert(t("auth.termsRequiredTitle"), t("auth.termsRequiredBody"));
        return;
      }
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
              void recordConsent({ version: LEGAL_VERSION, source });
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
    [acceptedTerms, goHome, startSSOFlow, t],
  );

  const onGoogle = useCallback(
    () => onSSO("oauth_google", "google"),
    [onSSO],
  );
  const onApple = useCallback(() => onSSO("oauth_apple", "apple"), [onSSO]);

  const isVerifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields?.includes("email_address") &&
    signUp.missingFields?.length === 0;

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
            <Feather name="user-plus" size={28} color="#ffffff" />
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
            {isVerifying ? t("auth.verifyTitle") : t("auth.signUpTitle")}
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
            {isVerifying
              ? t("auth.verifySubtitle", { email: emailAddress })
              : t("auth.signUpSubtitle")}
          </Text>
        </View>

        {isVerifying ? (
          <Card style={styles.card}>
            <Input
              label={t("auth.verificationCode")}
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
            />
            {errors?.fields?.code && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.fields.code.message}
              </Text>
            )}
            {submitError && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {submitError}
              </Text>
            )}

            <Button
              title={t("auth.verifyButton")}
              size="lg"
              disabled={!code || fetchStatus === "fetching"}
              loading={fetchStatus === "fetching"}
              onPress={handleVerify}
              style={{ marginTop: 12 }}
            />
            <Button
              title={t("auth.resendCode")}
              variant="ghost"
              onPress={() => signUp.verifications.sendEmailCode()}
              style={{ marginTop: 8 }}
            />
          </Card>
        ) : (
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
            {/*
              Apple Sign-In: hidden on Android per Apple HIG. Provider config
              (Clerk dashboard + Apple Developer portal + Expo plugin) is
              intentionally NOT included here — the button will gracefully
              fail until that wiring is done.
            */}
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
            {errors?.fields?.emailAddress && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.fields.emailAddress.message}
              </Text>
            )}

            <Input
              label={t("auth.password")}
              placeholder={t("auth.passwordPlaceholderSignUp")}
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

            <ConsentCheckbox
              accepted={acceptedTerms}
              onToggle={() => setAcceptedTerms((v) => !v)}
              colors={colors}
              t={t}
            />

            <Button
              title={t("auth.signUpButton")}
              size="lg"
              disabled={
                !emailAddress ||
                !password ||
                !acceptedTerms ||
                fetchStatus === "fetching"
              }
              loading={fetchStatus === "fetching"}
              onPress={handleSubmit}
              style={{ marginTop: 12 }}
            />

            <View nativeID="clerk-captcha" />
          </Card>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t("auth.hasAccount")}{" "}
          </Text>
          <Link
            href={
              (typeof next === "string" && next.startsWith("/")
                ? `/(auth)/sign-in?next=${encodeURIComponent(next)}`
                : "/(auth)/sign-in") as Href
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
              {t("auth.signIn")}
            </Text>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ConsentCheckbox({
  accepted,
  onToggle,
  colors,
  t,
}: {
  accepted: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  t: (key: string) => string;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.consentRow,
          {
            borderColor: accepted ? colors.primary : colors.border,
            backgroundColor: accepted ? colors.primary + "11" : "transparent",
          },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={t("auth.consentLabel")}
        accessibilityHint={t("auth.consentHint")}
        testID="signup-consent-checkbox"
      >
        <View
          style={[
            styles.consentBox,
            {
              borderColor: accepted ? colors.primary : colors.mutedForeground,
              backgroundColor: accepted ? colors.primary : "transparent",
            },
          ]}
        >
          {accepted ? <Feather name="check" size={14} color="#fff" /> : null}
        </View>
        <Text
          style={[
            styles.consentLabel,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_500Medium",
            },
          ]}
        >
          {t("auth.consentLabel")}
        </Text>
      </TouchableOpacity>
      <View style={styles.linksRow}>
        <Link href={"/legal/terms" as Href} asChild>
          <Pressable accessibilityRole="link" testID="signup-link-terms">
            <Text
              style={[
                styles.consentLink,
                {
                  color: colors.primary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                },
              ]}
            >
              {t("auth.termsLinkLabel")}
            </Text>
          </Pressable>
        </Link>
        <Text
          style={[styles.consentLinkSeparator, { color: colors.mutedForeground }]}
        >
          ·
        </Text>
        <Link href={"/legal/privacy" as Href} asChild>
          <Pressable accessibilityRole="link" testID="signup-link-privacy">
            <Text
              style={[
                styles.consentLink,
                {
                  color: colors.primary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                },
              ]}
            >
              {t("auth.privacyLinkLabel")}
            </Text>
          </Pressable>
        </Link>
      </View>
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
  title: { fontSize: 28, marginBottom: 8, textAlign: "center" },
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentLabel: { flex: 1, fontSize: 13, lineHeight: 18 },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  consentLink: { fontSize: 13, textDecorationLine: "underline" },
  consentLinkSeparator: { fontSize: 13 },
});
