import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import type { ShopKind } from "@workspace/api-client-react";

interface Props {
  value: ShopKind;
  onChange: (next: ShopKind) => void;
  /**
   * Optional override for the section label. Defaults to
   * `t("newShop.kindLabel")` when omitted.
   */
  label?: string;
}

const OPTIONS: { value: ShopKind; icon: keyof typeof Feather.glyphMap; tKey: string }[] = [
  { value: "products", icon: "package", tKey: "newShop.kindProducts" },
  { value: "services", icon: "briefcase", tKey: "newShop.kindServices" },
  { value: "hybrid", icon: "layers", tKey: "newShop.kindBoth" },
];

/**
 * Three-state segmented control for picking what a shop sells: products,
 * services, or both. Used on shop create + edit. Driving the Shop.kind field
 * is intentionally explicit (rather than auto-flipping in the UI) so that the
 * provider always sees what kind they currently are.
 */
export function ShopKindSelector({ value, onChange, label }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" },
        ]}
      >
        {label ?? t("newShop.kindLabel")}
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
                  fontSize: 13,
                }}
              >
                {t(opt.tKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
