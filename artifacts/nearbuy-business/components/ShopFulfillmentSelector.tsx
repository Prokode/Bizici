import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import type { ShopFulfillment } from "@workspace/api-client-react";

interface Props {
  value: ShopFulfillment;
  onChange: (next: ShopFulfillment) => void;
  label?: string;
  hint?: string | null;
}

const OPTIONS: {
  value: ShopFulfillment;
  icon: keyof typeof Feather.glyphMap;
  tKey: string;
}[] = [
  { value: "pickup_only", icon: "shopping-bag", tKey: "fulfillment.pickup" },
  { value: "delivery_only", icon: "truck", tKey: "fulfillment.delivery" },
  { value: "both", icon: "shuffle", tKey: "fulfillment.both" },
];

/**
 * Three-state segmented control for product shops: do they hand orders out
 * over the counter, deliver them, or both? Mirrors `ShopKindSelector` so the
 * controls stack cleanly on the shop edit screen.
 */
export function ShopFulfillmentSelector({ value, onChange, label, hint }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={[
          styles.label,
          {
            color: colors.foreground,
            fontFamily: "PlusJakartaSans_600SemiBold",
          },
        ]}
      >
        {t(label ?? "fulfillment.label")}
      </Text>
      <View
        style={[
          styles.row,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.pill,
                active && { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.85}
            >
              <Feather
                name={opt.icon}
                size={16}
                color={active ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={{
                  marginTop: 4,
                  color: active ? colors.primaryForeground : colors.foreground,
                  fontFamily: active
                    ? "PlusJakartaSans_700Bold"
                    : "PlusJakartaSans_500Medium",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {t(opt.tKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {hint ? (
        <Text
          style={{
            marginTop: 6,
            color: colors.mutedForeground,
            fontSize: 12,
            fontFamily: "PlusJakartaSans_400Regular",
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginBottom: 8 },
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
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
  },
});
