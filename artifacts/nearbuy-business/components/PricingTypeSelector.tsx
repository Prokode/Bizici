import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

export type PricingType = "fixed" | "hourly" | "quote";

interface Props {
  value: PricingType;
  onChange: (next: PricingType) => void;
}

const OPTIONS: PricingType[] = ["fixed", "hourly", "quote"];

/**
 * 3-state segmented control for the service pricing model. Mirrors how the
 * shop kind selector works on the new-shop screen — three equal-width pills
 * with the active one filled in `colors.primary`.
 */
export function PricingTypeSelector({ value, onChange }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const labels: Record<PricingType, string> = {
    fixed: t("services.pricingFixed"),
    hourly: t("services.pricingHourly"),
    quote: t("services.pricingQuote"),
  };
  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.muted },
      ]}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.pill,
              active && { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={{
                color: active ? colors.primaryForeground : colors.foreground,
                fontFamily: active
                  ? "PlusJakartaSans_700Bold"
                  : "PlusJakartaSans_500Medium",
                fontSize: 13,
              }}
            >
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});
