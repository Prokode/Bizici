import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyInterestsQueryKey, useGetMyInterests, useListCategories, useSetMyInterests } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { InterestPicker } from "@/components/InterestPicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INTEREST_DRAFT_DONE_KEY, INTEREST_DRAFT_KEY } from "@/lib/interestDraft";

export default function InterestsScreen() {
  const { isSignedIn, userId } = useAuth();
  return <InterestsContent key={userId ?? "signed-out"} isSignedIn={!!isSignedIn} userId={userId ?? null} />;
}

function InterestsContent({ isSignedIn, userId }: { isSignedIn: boolean; userId: string | null }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const interestsKey = [...getGetMyInterestsQueryKey(), userId ?? "signed-out"];
  const query = useGetMyInterests({ query: { enabled: isSignedIn && !!userId, queryKey: interestsKey } });
  const saveMutation = useSetMyInterests();
  const products = useListCategories({ kind: "product" });
  const services = useListCategories({ kind: "service" });
  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      if (query.data && !initialized) {
        setSelected(query.data.categoryIds);
        setInitialized(true);
      }
      return;
    }
    if (initialized) return;
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(INTEREST_DRAFT_KEY);
        if (!active) return;
        const value: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) setSelected(value);
        setInitialized(true);
      } catch {
        if (active) {
          setDraftError(true);
          setInitialized(true);
        }
      }
    })();
    return () => { active = false; };
  }, [initialized, isSignedIn, query.data]);

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const save = async () => {
    try {
      const result = await saveMutation.mutateAsync({ data: { categoryIds: selected } });
      client.setQueryData(interestsKey, result);
      router.back();
    } catch { /* visible error below */ }
  };
  const saveDraft = async () => {
    setSavingDraft(true);
    setDraftError(false);
    try {
      await AsyncStorage.setItem(INTEREST_DRAFT_KEY, JSON.stringify([...new Set(selected)]));
      await AsyncStorage.setItem(INTEREST_DRAFT_DONE_KEY, "1");
      router.back();
    } catch {
      setDraftError(true);
    } finally {
      setSavingDraft(false);
    }
  };
  const preferencesLoading = isSignedIn && (!userId || query.isLoading);
  const controlsDisabled = !initialized || preferencesLoading || products.isLoading || services.isLoading || saveMutation.isPending || savingDraft;

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: 24 }]}>
      <View style={[styles.mark, { backgroundColor: colors.accent }]}><Feather name="sliders" size={22} color={colors.primary} /></View>
      <Text style={[styles.title, { color: colors.foreground }]}>{t("social.interestsTitle")}</Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t("social.interestsHint")}</Text>
      {isSignedIn && query.isError ? <View style={{ gap: 12, marginTop: 20 }}><Text style={{ color: colors.destructive }}>{t("social.loadError")}</Text><Button title={t("common.retry")} onPress={() => query.refetch()} /></View> :
       preferencesLoading || (!isSignedIn && !initialized) ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> :
       <View style={[!isSignedIn && styles.login, !isSignedIn && { backgroundColor: colors.card, borderColor: colors.border }]}>
        {!isSignedIn && <Text style={{ color: colors.foreground }}>{t("social.interestsSignIn")}</Text>}
        <InterestPicker selected={selected} onToggle={toggle} />
        {(draftError || saveMutation.isError) && <Text style={[styles.error, { color: colors.destructive }]}>{t(draftError ? "social.localDraftError" : "social.saveError")}</Text>}
        {isSignedIn && <Text style={[styles.optional, { color: colors.mutedForeground }]}>{t("social.optionalHint")}</Text>}
        <View style={styles.actions}>
          <Button title={t("social.clear")} variant="outline" disabled={controlsDisabled} onPress={() => setSelected([])} />
          <View style={{ flex: 1 }}>
            <Button title={t("social.save")} fullWidth disabled={controlsDisabled} loading={saveMutation.isPending || savingDraft} onPress={isSignedIn ? save : saveDraft} />
          </View>
        </View>
        {!isSignedIn && <Button title={t("common.signIn")} variant="outline" onPress={() => router.push("/(auth)/sign-in" as Href)} />}
      </View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 22, flexGrow: 1 },
  mark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  hint: { fontSize: 14, lineHeight: 21, marginTop: 7 },
  login: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 16, marginTop: 24 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24 },
  optional: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },
  error: { marginTop: 4, fontSize: 13 },
});
