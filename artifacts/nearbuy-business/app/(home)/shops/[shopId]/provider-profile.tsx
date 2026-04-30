import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  getGetProviderProfileQueryOptions,
  useUpdateProviderProfile,
  getGetProviderProfileQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ProviderProfileScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const { data: profile } = useQuery({
    ...getGetProviderProfileQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ageStr, setAgeStr] = useState("");
  const [hideAge, setHideAge] = useState(false);
  const [bio, setBio] = useState("");
  const [yearsStr, setYearsStr] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certInput, setCertInput] = useState("");
  const [radiusStr, setRadiusStr] = useState("10");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setAgeStr(profile.age != null ? String(profile.age) : "");
      setHideAge(profile.hideAge ?? false);
      setBio(profile.bio ?? "");
      setYearsStr(
        profile.yearsExperience != null
          ? String(profile.yearsExperience)
          : "",
      );
      setCertifications(profile.certifications ?? []);
      setRadiusStr(
        profile.serviceRadiusKm != null
          ? String(profile.serviceRadiusKm)
          : "10",
      );
    }
  }, [profile]);

  const updateProfile = useUpdateProviderProfile();

  const addCertification = () => {
    const trimmed = certInput.trim();
    if (!trimmed) return;
    setCertifications((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    );
    setCertInput("");
  };
  const removeCertification = (c: string) =>
    setCertifications((prev) => prev.filter((x) => x !== c));

  const handleSave = () => {
    if (!shopId) return;
    setError(null);
    updateProfile.mutate(
      {
        shopId: shopId as string,
        data: {
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          age: ageStr.trim() ? parseInt(ageStr, 10) : null,
          hideAge,
          bio: bio.trim() || null,
          yearsExperience: yearsStr.trim() ? parseInt(yearsStr, 10) : null,
          certifications,
          serviceRadiusKm: radiusStr.trim()
            ? parseInt(radiusStr, 10)
            : undefined,
          portfolioPhotos: profile?.portfolioPhotos ?? [],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetProviderProfileQueryKey(shopId as string),
          });
          router.back();
        },
        onError: (err: any) => {
          setError(err?.message ?? t("providerProfile.saveError"));
        },
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t("providerProfile.screenTitle") }} />
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <Text
          style={[
            styles.intro,
            {
              color: colors.mutedForeground,
              fontFamily: "PlusJakartaSans_400Regular",
            },
          ]}
        >
          {t("providerProfile.intro")}
        </Text>

        <Input
          label={t("providerProfile.firstName")}
          value={firstName}
          onChangeText={setFirstName}
        />
        <Input
          label={t("providerProfile.lastName")}
          value={lastName}
          onChangeText={setLastName}
        />
        <Input
          label={t("providerProfile.age")}
          placeholder={t("providerProfile.agePlaceholder")}
          value={ageStr}
          onChangeText={setAgeStr}
          keyboardType="number-pad"
        />
        <View style={styles.toggleRow}>
          <Text
            style={{
              flex: 1,
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {t("providerProfile.hideAge")}
          </Text>
          <Switch
            value={hideAge}
            onValueChange={setHideAge}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Input
          label={t("providerProfile.bio")}
          placeholder={t("providerProfile.bioPlaceholder")}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Input
          label={t("providerProfile.yearsExperience")}
          placeholder={t("providerProfile.yearsPlaceholder")}
          value={yearsStr}
          onChangeText={setYearsStr}
          keyboardType="number-pad"
        />

        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_600SemiBold",
            },
          ]}
        >
          {t("providerProfile.certifications")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder={t("providerProfile.certificationsPlaceholder")}
              value={certInput}
              onChangeText={setCertInput}
              onSubmitEditing={addCertification}
            />
          </View>
          <Button
            title={t("providerProfile.addCertification")}
            variant="secondary"
            onPress={addCertification}
            style={{ marginTop: 18 }}
          />
        </View>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}
        >
          {certifications.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => removeCertification(c)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: colors.muted,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 13 }}>
                  {c}
                </Text>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label={t("providerProfile.serviceRadiusKm")}
          value={radiusStr}
          onChangeText={setRadiusStr}
          keyboardType="number-pad"
        />

        {error ? (
          <Text style={{ color: colors.destructive, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <Button
          title={t("providerProfile.save")}
          size="lg"
          loading={updateProfile.isPending}
          onPress={handleSave}
          style={{ marginTop: 24 }}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },
  intro: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  sectionLabel: { fontSize: 14, marginTop: 16, marginBottom: 8 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
});
