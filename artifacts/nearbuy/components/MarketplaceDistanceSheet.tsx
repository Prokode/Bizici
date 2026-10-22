import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

export const MARKETPLACE_SUGGESTED_KM = 5;
export const MARKETPLACE_PRESETS = [32, 64, 96, 160];
export const MARKETPLACE_MAX_KM = 400;

type Choice = "suggested" | number | "custom";

function toChoice(km: number): Choice {
  if (km === MARKETPLACE_SUGGESTED_KM) return "suggested";
  if (MARKETPLACE_PRESETS.includes(km)) return km;
  return "custom";
}

export function MarketplaceDistanceSheet({
  visible,
  radiusKm,
  onClose,
  onApply,
}: {
  visible: boolean;
  radiusKm: number;
  onClose: () => void;
  onApply: (km: number) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [choice, setChoice] = useState<Choice>(toChoice(radiusKm));
  const [custom, setCustom] = useState<number>(toChoice(radiusKm) === "custom" ? radiusKm : 200);
  const [customText, setCustomText] = useState(String(custom));

  const onShow = () => {
    const c = toChoice(radiusKm);
    setChoice(c);
    const v = c === "custom" ? radiusKm : 200;
    setCustom(v);
    setCustomText(String(v));
  };

  const setCustomValue = (v: number) => {
    const clamped = Math.max(1, Math.min(MARKETPLACE_MAX_KM, Math.round(v)));
    setCustom(clamped);
    setCustomText(String(clamped));
    setChoice("custom");
  };

  const selectedKm =
    choice === "suggested" ? MARKETPLACE_SUGGESTED_KM : choice === "custom" ? custom : choice;
  const isDefault = choice === "suggested";

  const Radio = ({ on }: { on: boolean }) => (
    <View style={[styles.radio, { borderColor: on ? colors.primary : colors.mutedForeground }]}>
      {on ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );

  const rows: { key: string; label: string; c: Choice }[] = [
    { key: "s", label: t("marketplaceSearch.suggested", { km: MARKETPLACE_SUGGESTED_KM }), c: "suggested" },
    ...MARKETPLACE_PRESETS.map((km) => ({ key: String(km), label: `${km} km`, c: km as Choice })),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={onShow}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="marketplace-distance-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t("marketplaceSearch.close")}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>{t("marketplaceSearch.distance")}</Text>
          <Pressable onPress={() => setChoice("suggested")} disabled={isDefault} hitSlop={12} testID="marketplace-distance-reset">
            <Text style={[styles.reset, { color: isDefault ? colors.mutedForeground : colors.primary }]}>
              {t("marketplaceSearch.reset")}
            </Text>
          </Pressable>
        </View>
        {rows.map((r) => (
          <Pressable key={r.key} style={styles.row} onPress={() => setChoice(r.c)}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{r.label}</Text>
            <Radio on={choice === r.c} />
          </Pressable>
        ))}
        <Pressable style={styles.row} onPress={() => setChoice("custom")}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{t("marketplaceSearch.custom")}</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {t("marketplaceSearch.customHint", { max: MARKETPLACE_MAX_KM })}
            </Text>
          </View>
          <Radio on={choice === "custom"} />
        </Pressable>
        <View style={[styles.stepper, { opacity: choice === "custom" ? 1 : 0.55 }]}>
          <Pressable onPress={() => setCustomValue(custom - 10)} style={[styles.stepBtn, { backgroundColor: colors.muted }]} accessibilityLabel="-10 km">
            <Feather name="minus" size={18} color={colors.foreground} />
          </Pressable>
          <View style={[styles.track, { backgroundColor: colors.muted }]}>
            <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(custom / MARKETPLACE_MAX_KM) * 100}%` }]} />
          </View>
          <Pressable onPress={() => setCustomValue(custom + 10)} style={[styles.stepBtn, { backgroundColor: colors.muted }]} accessibilityLabel="+10 km">
            <Feather name="plus" size={18} color={colors.foreground} />
          </Pressable>
          <TextInput
            value={customText}
            onChangeText={(v) => { setCustomText(v.replace(/[^0-9]/g, "")); setChoice("custom"); }}
            onEndEditing={() => setCustomValue(Number(customText) || 1)}
            onBlur={() => setCustomValue(Number(customText) || 1)}
            keyboardType="number-pad"
            style={[styles.kmInput, { color: colors.foreground, borderColor: colors.border }]}
            testID="marketplace-distance-custom"
          />
          <Text style={{ color: colors.mutedForeground }}>km</Text>
        </View>
        <Pressable
          testID="marketplace-distance-apply"
          onPress={() => {
            const km = choice === "custom" ? Math.max(1, Math.min(MARKETPLACE_MAX_KM, Number(customText) || custom)) : selectedKm;
            onApply(km);
          }}
          style={({ pressed }) => [styles.apply, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.applyText, { color: colors.primaryForeground }]}>{t("marketplaceSearch.seeItems")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: "700" },
  reset: { fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  sub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4 },
  kmInput: { width: 54, borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 6, textAlign: "center", fontSize: 14 },
  apply: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  applyText: { fontSize: 16, fontWeight: "700" },
});
