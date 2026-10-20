import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/Select";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useColors } from "@/hooks/useColors";

export function CurrencyPreference() {
  const { t } = useTranslation();
  const colors = useColors();
  const { currency, setCurrency, availableCurrencies, updatedAt, ratesUnavailable } = useCurrency();
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const codes = [...new Set([...(currency === "seller" ? [] : [currency]), ...availableCurrencies])];
  return (
    <View style={{ marginVertical: 12, gap: 6 }} testID="currency-preference">
      <Select
        label={t("currency.label")}
        title={t("currency.label")}
        searchable
        disabled={saving}
        value={currency}
        options={[
          { label: t("currency.seller"), value: "seller" },
          ...codes.map((code) => ({
            label: code === "XOF" ? "XOF · FCFA (BCEAO)" : code === "XAF" ? "XAF · FCFA (BEAC)" : code,
            value: code,
          })),
        ]}
        onChange={(code) => {
          setSaving(true);
          setError(false);
          void setCurrency(code).catch(() => setError(true)).finally(() => setSaving(false));
        }}
      />
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
        {ratesUnavailable ? t("currency.unavailable") : t("currency.estimate", { date: updatedAt?.slice(0, 10) })}
      </Text>
      {!ratesUnavailable && (
        <Text accessibilityRole="link" onPress={() => void Linking.openURL("https://www.exchangerate-api.com")} style={{ color: colors.primary, fontSize: 12 }}>
          {t("currency.attribution")}
        </Text>
      )}
      {error && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{t("currency.saveError")}</Text>}
    </View>
  );
}
