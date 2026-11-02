import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/Button";

export type PriceFilter = { minPrice?: number; maxPrice?: number; priceCurrency: string };

export function PriceRangeSheet({ visible, value, onClose, onApply }: {
  visible: boolean; value: PriceFilter | null; onClose: () => void; onApply: (value: PriceFilter | null) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currency, availableCurrencies } = useCurrency();
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const currencies = [...new Set(["XOF", "XAF", "EUR", "USD", "GBP", ...availableCurrencies, ...(code ? [code] : [])])];
  const apply = () => {
    const parse = (text: string) => {
      const normalized = text.trim().replace(",", ".");
      if (!normalized) return undefined;
      return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
    };
    const minPrice = parse(min), maxPrice = parse(max);
    if (minPrice === undefined && maxPrice === undefined) { onApply(null); return; }
    if ([minPrice, maxPrice].some((n) => n !== undefined && (!Number.isFinite(n) || n > 1e12)) ||
        (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) || !code) {
      setError(true); return;
    }
    onApply({ ...(minPrice !== undefined ? { minPrice } : {}), ...(maxPrice !== undefined ? { maxPrice } : {}), priceCurrency: code });
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => {
    setMin(value?.minPrice?.toString() ?? "");
    setMax(value?.maxPrice?.toString() ?? "");
    setCode(value?.priceCurrency ?? (currency === "seller" ? "" : currency));
    setError(false);
  }}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} />
      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, gap: 16, maxHeight: "80%" }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 21, fontWeight: "700" }}>{t("priceFilter.title")}</Text>
          <Text style={{ color: colors.mutedForeground }}>{t("priceFilter.hint")}</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{t("priceFilter.currency")}</Text>
          <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {currencies.map((item) => <Pressable key={item} onPress={() => setCode(item)} accessibilityRole="button" accessibilityState={{ selected: code === item }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 20, backgroundColor: code === item ? colors.primary : colors.muted }}>
              <Text style={{ color: code === item ? colors.primaryForeground : colors.foreground }}>{item === "XOF" || item === "XAF" ? `${item} · F CFA` : item}</Text>
            </Pressable>)}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {([{ label: "minimum", text: min, set: setMin }, { label: "maximum", text: max, set: setMax }] as const).map((field) => <View key={field.label} style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.foreground }}>{t(`priceFilter.${field.label}`)}{code ? ` (${code})` : ""}</Text>
              <TextInput testID={`price-${field.label}`} accessibilityLabel={t(`priceFilter.${field.label}`)} value={field.text} onChangeText={field.set} placeholder={t("priceFilter.noLimit")} placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" maxLength={16} style={{ color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48 }} />
            </View>)}
          </View>
          {error && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{t("priceFilter.invalid")}</Text>}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title={t("priceFilter.reset")} variant="outline" onPress={() => onApply(null)} />
          <Button title={t("priceFilter.apply")} testID="price-apply" onPress={apply} style={{ flex: 1 }} />
        </View>
        <Button title={t("common.close")} variant="ghost" onPress={onClose} />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
