import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Redirect, router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { useAddPassword } from "@/hooks/useAddPassword";

const MIN_LENGTH = 8;

function isPrivateRelay(email: string | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@privaterelay.appleid.com");
}

export function AccountSecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const sec = useAddPassword();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");

  // Clear passwords once added; always clear on unmount (state is in-memory only).
  useEffect(() => {
    if (sec.success) {
      setPassword("");
      setConfirm("");
      setCode("");
    }
  }, [sec.success]);
  const verification = sec.verification;
  const retryAfter = verification?.retryAfter ?? 0;
  // Reset code input when switching verification phase/factor.
  const phaseKey = verification ? `${verification.phase}:${verification.selectedLabel ?? ""}` : "";
  useEffect(() => setCode(""), [phaseKey]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/" as Href);
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  if (sec.isLoaded && !sec.isSignedIn) return <Redirect href={"/(auth)/sign-in" as Href} />;

  const font = (w: "400" | "500" | "600" | "700") =>
    ({ "400": "PlusJakartaSans_400Regular", "500": "PlusJakartaSans_500Medium", "600": "PlusJakartaSans_600SemiBold", "700": "PlusJakartaSans_700Bold" })[w];

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: font("500") },
  ];

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={t("security.back")}
        hitSlop={10}
        style={[styles.backBtn, { backgroundColor: colors.muted }]}
        testID="security-back"
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground, fontFamily: font("700") }]}>
        {t("security.title")}
      </Text>
    </View>
  );

  if (!sec.isLoaded) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: topPad + 16 }]}>
        <View style={styles.pad}>{header}</View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={t("security.loading")} />
        </View>
      </View>
    );
  }

  const errorBox = sec.error ? (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.errorBox, { borderColor: colors.destructive }]}
      testID="security-error"
    >
      <Feather name="alert-circle" size={16} color={colors.destructive} />
      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: font("500") }]}>{sec.error}</Text>
    </View>
  ) : null;

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const waitSeconds = retryAfter;

  let body: React.ReactNode;
  if (sec.success) {
    body = (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLiveRegion="polite">
        <View style={[styles.iconCircle, { backgroundColor: colors.success ?? colors.primary }]}>
          <Feather name="check" size={22} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font("700") }]} accessibilityRole="alert">
          {t("security.successTitle")}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.successBody")}</Text>
        <Button title={t("security.done")} onPress={goBack} fullWidth style={styles.mt} testID="security-done" />
      </View>
    );
  } else if (sec.hasPassword) {
    body = (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name="lock" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font("700") }]}>{t("security.hasPasswordTitle")}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.hasPasswordBody")}</Text>
      </View>
    );
  } else if (verification) {
    body = (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name="shield" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font("700") }]}>{t("security.verifyTitle")}</Text>
        {verification.phase === "choose" ? (
          <>
            <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.chooseFactor")}</Text>
            {verification.factors.length === 0 ? (
              <Text style={[styles.body, { color: colors.foreground, fontFamily: font("500") }]}>{t("security.verificationUnavailable")}</Text>
            ) : (
              verification.factors.map((f) => (
                <Button
                  key={f.id}
                  title={f.label}
                  variant="outline"
                  fullWidth
                  disabled={sec.busy}
                  onPress={() => void sec.chooseFactor(f.id)}
                  style={styles.factorBtn}
                  testID={`security-factor-${f.id}`}
                />
              ))
            )}
          </>
        ) : (
          <>
            {verification.selectedLabel ? (
              <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{verification.selectedLabel}</Text>
            ) : null}
            <Text style={[styles.label, { color: colors.foreground, fontFamily: font("600") }]} nativeID="security-code-label">
              {verification.inputIsPassword ? t("security.currentPassword") : t("security.code")}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              secureTextEntry={verification.inputIsPassword}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={verification.inputIsPassword ? "current-password" : "one-time-code"}
              textContentType={verification.inputIsPassword ? "password" : "oneTimeCode"}
              editable={!sec.busy}
              accessibilityLabel={verification.inputIsPassword ? t("security.currentPassword") : t("security.code")}
              accessibilityLabelledBy="security-code-label"
              style={inputStyle}
              placeholderTextColor={colors.mutedForeground}
              testID="security-code"
              onSubmitEditing={() => code && void sec.verify(code)}
            />
            <Button
              title={t("security.verify")}
              onPress={() => void sec.verify(code)}
              loading={sec.busy}
              disabled={sec.busy || !code.trim()}
              fullWidth
              style={styles.mt}
              testID="security-verify"
            />
            {verification.canResend ? (
              <Button
                title={waitSeconds > 0 ? t("security.resendIn", { seconds: waitSeconds }) : t("security.resend")}
                variant="ghost"
                onPress={() => void sec.resend()}
                disabled={sec.busy || waitSeconds > 0}
                fullWidth
                testID="security-resend"
              />
            ) : null}
          </>
        )}
        {errorBox}
        <Button
          title={t("security.cancel")}
          variant="ghost"
          onPress={sec.cancelVerification}
          disabled={sec.busy}
          fullWidth
          testID="security-cancel"
        />
      </View>
    );
  } else {
    body = (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font("700") }]}>{t("security.addTitle")}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.addBody")}</Text>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: font("600") }]} nativeID="security-password-label">
          {t("security.newPassword")}
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!sec.busy}
          accessibilityLabel={t("security.newPassword")}
          accessibilityHint={t("security.minHint")}
          accessibilityLabelledBy="security-password-label"
          style={inputStyle}
          testID="security-password"
        />
        <Text style={[styles.hint, { color: tooShort ? colors.destructive : colors.mutedForeground, fontFamily: font("500") }]}>
          {t("security.minHint")}
        </Text>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: font("600") }]} nativeID="security-confirm-label">
          {t("security.confirmPassword")}
        </Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!sec.busy}
          accessibilityLabel={t("security.confirmPassword")}
          accessibilityLabelledBy="security-confirm-label"
          style={inputStyle}
          testID="security-confirm"
          onSubmitEditing={() => void sec.submit(password, confirm)}
        />
        {!sec.email ? (
          <Text accessibilityRole="alert" style={[styles.hint, { color: colors.destructive, fontFamily: font("500") }]}>
            {t("security.noEmailBody")}
          </Text>
        ) : null}
        {errorBox}
        <Button
          title={t("security.submit")}
          onPress={() => void sec.submit(password, confirm)}
          loading={sec.busy}
          disabled={sec.busy || !sec.email}
          fullWidth
          style={styles.mt}
          testID="security-submit"
        />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.pad, { paddingTop: topPad + 16, paddingBottom: bottomPad + 32 }]}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, styles.noTop, { color: colors.mutedForeground, fontFamily: font("600") }]}>
          {t("security.email")}
        </Text>
        <Text style={[styles.email, { color: colors.foreground, fontFamily: font("700") }]} selectable>
          {sec.email ?? t("security.noEmail")}
        </Text>
        {isPrivateRelay(sec.email) ? (
          <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.relayInfo")}</Text>
        ) : null}
        <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: font("400") }]}>{t("security.socialKept")}</Text>
      </View>
      {body}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, flex: 1 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16, gap: 6 },
  cardTitle: { fontSize: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, marginTop: 10 },
  noTop: { marginTop: 0 },
  email: { fontSize: 16 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  factorBtn: { marginTop: 8 },
  mt: { marginTop: 12 },
});
