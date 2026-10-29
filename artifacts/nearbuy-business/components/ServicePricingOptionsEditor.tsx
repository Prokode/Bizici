import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  type PricingOptionDraft,
  type ServicePricingOption,
  toPricingOptionDrafts,
  validatePricingOptionDrafts,
} from "@/lib/servicePricingOptions";

type Props = {
  initialOptions?: ServicePricingOption[] | null;
  currencyCode?: string;
  onOptionsChange: (options: ServicePricingOption[]) => void;
  onValidationChange: (errorKey: string | null) => void;
  onEnabledChange?: (enabled: boolean) => void;
  hidden?: boolean;
};

export function ServicePricingOptionsEditor({
  initialOptions,
  currencyCode,
  onOptionsChange,
  onValidationChange,
  onEnabledChange,
  hidden = false,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(!!initialOptions?.length);
  const [drafts, setDrafts] = useState<PricingOptionDraft[]>(() =>
    toPricingOptionDrafts(initialOptions),
  );
  const validation = validatePricingOptionDrafts(drafts);
  const callbacksRef = useRef({ onOptionsChange, onValidationChange, onEnabledChange });
  callbacksRef.current = { onOptionsChange, onValidationChange, onEnabledChange };

  useEffect(() => {
    callbacksRef.current.onEnabledChange?.(enabled);
    if (!enabled) {
      callbacksRef.current.onValidationChange(null);
      return;
    }
    callbacksRef.current.onValidationChange(validation.valid ? null : validation.errorKey);
    if (validation.valid) callbacksRef.current.onOptionsChange(validation.options);
  }, [enabled, drafts]);

  const updateDraft = (index: number, key: keyof PricingOptionDraft, value: string) => {
    setDrafts((current) => current.map((draft, rowIndex) =>
      rowIndex === index ? { ...draft, [key]: value } : draft,
    ));
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <View style={[styles.wrapper, hidden && styles.hidden]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {t("newService.pricingOptions")}
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {t("newService.pricingOptionsHint")}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(next) => {
            setEnabled(next);
            if (next && drafts.length === 0) {
              setDrafts([{ label: "", durationMinutes: "", price: "" }]);
            }
            if (!next) {
              onOptionsChange([]);
              onValidationChange(null);
            }
          }}
          trackColor={{ true: colors.primary }}
          accessibilityLabel={t("newService.pricingOptions")}
        />
      </View>
      {enabled ? (
        <View style={styles.options}>
          {drafts.map((draft, index) => (
            <View key={index} style={[styles.option, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.optionTop}>
                <Text style={[styles.optionLabel, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                  {t("newService.pricingOptionNumber", { number: index + 1 })}
                </Text>
                {drafts.length > 1 ? (
                  <TouchableOpacity onPress={() => removeDraft(index)} accessibilityRole="button">
                    <Text style={[styles.remove, { color: colors.destructive }]}>{t("newService.removePricingOption")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Input
                label={t("newService.pricingOptionLabel")}
                placeholder={t("newService.pricingOptionLabelPlaceholder")}
                value={draft.label}
                onChangeText={(value) => updateDraft(index, "label", value)}
                maxLength={80}
              />
              <View style={styles.numericRow}>
                <View style={styles.numericCell}>
                  <Input
                    label={t("newService.durationMinutes")}
                    placeholder={t("newService.durationPlaceholder")}
                    value={draft.durationMinutes}
                    onChangeText={(value) => updateDraft(index, "durationMinutes", value)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.numericCell}>
                  <Input
                    label={`${t("newService.price")}${currencyCode ? ` (${currencyCode})` : ""}`}
                    placeholder={t("newService.pricePlaceholder")}
                    value={draft.price}
                    onChangeText={(value) => updateDraft(index, "price", value)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          ))}
          {validation.valid ? null : (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {t(validation.errorKey)}
            </Text>
          )}
          {drafts.length < 20 ? (
            <Button
              title={t("newService.addPricingOption")}
              variant="outline"
              size="sm"
              onPress={() => setDrafts((current) => [...current, { label: "", durationMinutes: "", price: "" }])}
            />
          ) : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t("newService.pricingOptionLimit")}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 18, marginBottom: 4 },
  hidden: { display: "none" },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  headingCopy: { flex: 1 },
  title: { fontSize: 15 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  options: { gap: 12, marginTop: 14 },
  option: { borderWidth: 1, borderRadius: 16, padding: 14 },
  optionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  optionLabel: { fontSize: 13 },
  remove: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold" },
  numericRow: { flexDirection: "row", gap: 10 },
  numericCell: { flex: 1 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
