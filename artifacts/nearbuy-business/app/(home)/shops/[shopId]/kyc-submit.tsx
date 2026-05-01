import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  submitShopKyc,
  getGetShopKycStatusQueryKey,
  type KycSubmitBody,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type DocType = KycSubmitBody["documentType"];

const DOC_TYPES: { key: DocType; needsBack: boolean }[] = [
  { key: "id_card", needsBack: true },
  { key: "passport", needsBack: false },
  { key: "driver_license", needsBack: true },
];

export default function KycSubmitScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const [docType, setDocType] = useState<DocType>("id_card");
  const [front, setFront] = useState<{ uri: string; base64: string } | null>(null);
  const [back, setBack] = useState<{ uri: string; base64: string } | null>(null);

  const needsBack = DOC_TYPES.find((d) => d.key === docType)?.needsBack ?? false;

  const mutation = useMutation({
    mutationFn: () =>
      submitShopKyc(shopId, {
        documentType: docType,
        frontImageBase64: front!.base64,
        backImageBase64: needsBack && back ? back.base64 : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getGetShopKycStatusQueryKey(shopId),
      });
      Alert.alert(t("kyc.submit.successTitle"), t("kyc.submit.successBody"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert(t("kyc.submit.errorTitle"), t("kyc.submit.errorBody"));
    },
  });

  const pick = async (slot: "front" | "back") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("kyc.submit.permTitle"), t("kyc.submit.permBody"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const a = result.assets[0];
      const payload = { uri: a.uri, base64: a.base64 as string };
      if (slot === "front") setFront(payload);
      else setBack(payload);
    }
  };

  const canSubmit = !!front && (!needsBack || !!back) && !mutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: t("kyc.submit.headerTitle") }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
        >
          {t("kyc.submit.title")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" },
          ]}
        >
          {t("kyc.submit.subtitle")}
        </Text>

        <Text
          style={[
            styles.label,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
        >
          {t("kyc.submit.docTypeLabel")}
        </Text>
        <View style={styles.radioGroup}>
          {DOC_TYPES.map((d) => {
            const selected = d.key === docType;
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => {
                  setDocType(d.key);
                  setBack(null);
                }}
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary + "11" : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: selected ? colors.primary : colors.mutedForeground,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.radioLabel,
                    {
                      color: colors.foreground,
                      fontFamily: "PlusJakartaSans_500Medium",
                    },
                  ]}
                >
                  {t(`kyc.submit.docType.${d.key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PhotoSlot
          label={t("kyc.submit.frontLabel")}
          hint={t("kyc.submit.frontHint")}
          photo={front}
          onPick={() => pick("front")}
          colors={colors}
        />

        {needsBack ? (
          <PhotoSlot
            label={t("kyc.submit.backLabel")}
            hint={t("kyc.submit.backHint")}
            photo={back}
            onPick={() => pick("back")}
            colors={colors}
          />
        ) : null}

        <Card style={styles.privacyCard}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <Text
            style={[
              styles.privacyText,
              {
                color: colors.mutedForeground,
                fontFamily: "PlusJakartaSans_400Regular",
              },
            ]}
          >
            {t("kyc.submit.privacy")}
          </Text>
        </Card>

        <Button
          title={t("kyc.submit.submitCta")}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </>
  );
}

type SlotProps = {
  label: string;
  hint: string;
  photo: { uri: string } | null;
  onPick: () => void;
  colors: ReturnType<typeof useColors>;
};

function PhotoSlot({ label, hint, photo, onPick, colors }: SlotProps) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
        ]}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPick}
        style={[
          styles.photoSlot,
          { borderColor: colors.border, backgroundColor: colors.muted + "33" },
        ]}
      >
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Feather name="camera" size={32} color={colors.mutedForeground} />
            <Text
              style={[
                styles.photoHint,
                {
                  color: colors.mutedForeground,
                  fontFamily: "PlusJakartaSans_400Regular",
                },
              ]}
            >
              {hint}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 64 },
  title: { fontSize: 22, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 14, marginBottom: 8 },
  radioGroup: { gap: 8, marginBottom: 8 },
  radio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  radioLabel: { fontSize: 15 },
  photoSlot: {
    height: 180,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoHint: { fontSize: 13, textAlign: "center", paddingHorizontal: 16 },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 16 },
});
