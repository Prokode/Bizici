import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSignIn, useSSO } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
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

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setSubmitError(error.errors?.[0]?.longMessage ?? error.message ?? "Sign in failed");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) return;
            router.replace("/(home)" as Href);
          },
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? "Something went wrong");
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
            router.replace("/(home)" as Href);
          },
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? "Google sign-in failed");
    }
  }, [router, startSSOFlow]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="shopping-bag" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            Sign in to manage your shops
          </Text>
        </View>

        <Card style={styles.card}>
          <Button
            title="Continue with Google"
            variant="secondary"
            icon={<Feather name="chrome" size={18} color={colors.secondaryForeground} />}
            onPress={onGoogle}
            style={{ marginBottom: 16 }}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors?.fields?.identifier && (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.fields.identifier.message}</Text>
          )}

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors?.fields?.password && (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.fields.password.message}</Text>
          )}
          {submitError && <Text style={[styles.error, { color: colors.destructive }]}>{submitError}</Text>}

          <Button
            title="Sign in"
            size="lg"
            disabled={!emailAddress || !password || fetchStatus === "fetching"}
            loading={fetchStatus === "fetching"}
            onPress={handleSubmit}
            style={{ marginTop: 12 }}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Don't have an account? </Text>
          <Link href={"/(auth)/sign-up" as Href}>
            <Text style={[styles.link, { color: colors.primary, fontFamily: "PlusJakartaSans_600SemiBold" }]}>Sign up</Text>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },
  header: { alignItems: "center", marginTop: 24, marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 16 },
  card: { padding: 20, marginBottom: 24 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divider: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16 },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
  error: { fontSize: 13, marginTop: -8, marginBottom: 8 },
});
