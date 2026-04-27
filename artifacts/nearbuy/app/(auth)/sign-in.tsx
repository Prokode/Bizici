import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSignIn, useSSO } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    router.replace("/(tabs)/profile" as Href);
  }, [router]);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setSubmitError(
          error.errors?.[0]?.longMessage ??
            error.message ??
            "Identifiants invalides",
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
      setSubmitError(err?.message ?? "Une erreur est survenue");
    }
  };

  const onGoogle = useCallback(async () => {
    setSubmitError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
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
      setSubmitError(err?.message ?? "Connexion Google impossible");
    }
  }, [goHome, startSSOFlow]);

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
            Retour
          </Text>
        </Pressable>

        <View style={styles.header}>
          <LinearGradient
            colors={["#FF6B35", "#FF3D7F"]}
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
            Bon retour !
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
            Connectez-vous pour gagner du Karma et confirmer les stocks.
          </Text>
        </View>

        <Card style={styles.card}>
          <Button
            title="Continuer avec Google"
            variant="secondary"
            icon={
              <Feather
                name="chrome"
                size={18}
                color={colors.secondaryForeground}
              />
            }
            onPress={onGoogle}
            style={{ marginBottom: 16 }}
          />

          <View style={styles.dividerRow}>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Text
              style={[styles.dividerText, { color: colors.mutedForeground }]}
            >
              ou
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </View>

          <Input
            label="E-mail"
            placeholder="vous@exemple.com"
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
            label="Mot de passe"
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
            title="Se connecter"
            size="lg"
            disabled={!emailAddress || !password || fetchStatus === "fetching"}
            loading={fetchStatus === "fetching"}
            onPress={handleSubmit}
            style={{ marginTop: 12 }}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Pas encore de compte ?{" "}
          </Text>
          <Link href={"/(auth)/sign-up" as Href}>
            <Text
              style={[
                styles.link,
                {
                  color: colors.primary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                },
              ]}
            >
              Créer un compte
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
