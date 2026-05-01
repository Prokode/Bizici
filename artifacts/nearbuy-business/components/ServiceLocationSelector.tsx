import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export type ServiceLocationValue = "at_shop" | "at_customer" | "both";
export type ServiceLocationOverrideValue = ServiceLocationValue | "inherit";

interface BaseProps<V extends string> {
  value: V;
  onChange: (next: V) => void;
  label?: string;
  hint?: string | null;
}

const BASE_OPTIONS: {
  value: ServiceLocationValue;
  icon: keyof typeof Feather.glyphMap;
  tKey: string;
}[] = [
  { value: "at_shop", icon: "home", tKey: "serviceLocation.atShop" },
  { value: "at_customer", icon: "navigation", tKey: "serviceLocation.atCustomer" },
  { value: "both", icon: "shuffle", tKey: "serviceLocation.both" },
];

/**
 * Three-state segmented control for the shop/provider's default execution
 * mode. Mirrors the visual language of `ShopKindSelector` so the two stack
 * cleanly on the provider profile screen.
 */
export function ServiceLocationSelector({
  value,
  onChange,
  label,
  hint,
}: BaseProps<ServiceLocationValue>) {
  return (
    <Selector
      options={BASE_OPTIONS}
      value={value}
      onChange={onChange}
      label={label ?? "serviceLocation.label"}
      hint={hint}
    />
  );
}

const OVERRIDE_OPTIONS: {
  value: ServiceLocationOverrideValue;
  icon: keyof typeof Feather.glyphMap;
  tKey: string;
}[] = [
  { value: "inherit", icon: "corner-up-left", tKey: "serviceLocation.inherit" },
  ...BASE_OPTIONS,
];

/**
 * Four-state segmented control for per-Service overrides. The "inherit"
 * option (default) means "fall back to whatever the shop is set to" — that's
 * what 95% of services use, so it's surfaced first.
 */
export function ServiceLocationOverrideSelector({
  value,
  onChange,
  label,
  hint,
}: BaseProps<ServiceLocationOverrideValue>) {
  return (
    <Selector
      options={OVERRIDE_OPTIONS}
      value={value}
      onChange={onChange}
      label={label ?? "serviceLocation.overrideLabel"}
      hint={hint}
    />
  );
}

interface SelectorProps<V extends string> extends BaseProps<V> {
  options: {
    value: V;
    icon: keyof typeof Feather.glyphMap;
    tKey: string;
  }[];
}

function Selector<V extends string>({
  options,
  value,
  onChange,
  label,
  hint,
}: SelectorProps<V>) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_600SemiBold",
            },
          ]}
        >
          {t(label)}
        </Text>
      ) : null}
      <View
        style={[
          styles.row,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        {options.map((opt) => {
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
