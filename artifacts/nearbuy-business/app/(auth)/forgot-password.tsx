import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSignIn } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

/**
 * Two-step forgot-password flow built on Clerk's "future" `signIn.resetPasswordEmailCode`
 * API. Step 1 creates the sign-in attempt with the email and sends a reset code.
 * Step 2 verifies the code, submits the new password, and `finalize()` activates
 * the new session — same pattern used by the password sign-in screen.
 *
 * MFA sellers (TOTP / second factor) will land in `needs_second_factor` after
 * the reset — surface a generic error and ask them to finish on the web. Wire
 * a second-factor screen later if MFA usage grows.
 */
export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn, fetchStatus } = useSignIn();

  const [stage, setStage] = useState<"request" | "verify">("request");
  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const created = await signIn.create({ identifier: emailAddress.trim() });
      if (created.error) {
        setError(
          created.error.message ??
            t("auth.errorForgotRequest"),
        );
        return;
      }
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) {
        setError(
          sent.error.message ??
            t("auth.errorForgotRequest"),
        );
        return;
      }
      setStage("verify");
    } catch (err: any) {
      setError(err?.message ?? t("auth.errorForgotRequest"));
    } finally {
      setSubmitting(false);
    }
  }, [signIn, emailAddress, t]);

  const resetPassword = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const verified = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (verified.error) {
        setError(
          verified.error.message ??
            t("auth.errorForgotReset"),
        );
        return;
      }
      const submitted = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (submitted.error) {
        setError(
          submitted.error.message ??
            t("auth.errorForgotReset"),
        );
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) return;
            router.replace("/(home)" as Href);
          },
        });
      } else {
        setError(t("auth.errorForgotMfa"));
      }
    } catch (err: any) {
      setError(err?.message ?? t("auth.errorForgotReset"));
    } finally {
      setSubmitting(false);
    }
  }, [signIn, code, newPassword, router, t]);

  const busy = submitting || fetchStatus === "fetching";

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
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="key" size={28} color={colors.primaryForeground} />
          </View>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: "PlusJakartaSans_700Bold",
              },
            ]}
          >
            {t("auth.forgotTitle")}
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
            {stage === "request"
              ? t("auth.forgotSubtitle")
              : t("auth.forgotVerifySubtitle", { email: emailAddress })}
          </Text>
        </View>

        <Card style={styles.card}>
          {stage === "request" ? (
            <>
              <Input
                label={t("auth.email")}
                placeholder={t("auth.emailPlaceholder")}
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {error && (
                <Text style={[styles.error, { color: colors.destructive }]}>
                  {error}
                </Text>
              )}
              <Button
                title={t("auth.forgotSendCode")}
                size="lg"
                disabled={!emailAddress || busy}
                loading={busy}
                onPress={requestCode}
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <Input
                label={t("auth.verificationCode")}
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              <Input
                label={t("auth.newPassword")}
                placeholder={t("auth.passwordPlaceholderSignUp")}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              {error && (
                <Text style={[styles.error, { color: colors.destructive }]}>
                  {error}
                </Text>
              )}
              <Button
                title={t("auth.forgotResetButton")}
                size="lg"
                disabled={!code || !newPassword || newPassword.length < 8 || busy}
                loading={busy}
                onPress={resetPassword}
                style={{ marginTop: 12 }}
              />
              <Pressable
                onPress={() => {
                  setError(null);
                  setStage("request");
                }}
                style={{ marginTop: 12, alignSelf: "center" }}
              >
                <Text style={[styles.link, { color: colors.primary }]}>
                  {t("auth.forgotChangeEmail")}
                </Text>
              </Pressable>
            </>
          )}
        </Card>
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
  link: { fontSize: 14, fontWeight: "600" },
  error: { fontSize: 13, marginTop: -8, marginBottom: 8 },
});
