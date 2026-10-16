import React, { useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { getLanguage, setLanguage, type SupportedLang } from "@/lib/i18n";
import {
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
};

function Segmented<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.track, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              testID={`${testIDPrefix}-${o.value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, selected: active }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={[styles.option, active && { backgroundColor: colors.primary }]}
            >
              {o.icon ? (
                <Feather
                  name={o.icon}
                  size={14}
                  color={active ? colors.primaryForeground : colors.foreground}
                />
              ) : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.optionText,
                  { color: active ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Language + theme choices shown on the first onboarding page. */
export function OnboardingPreferences() {
  const { t, i18n } = useTranslation();
  const theme = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    getThemePreference,
  );
  const colors = useColors();
  const [saveError, setSaveError] = useState(false);
  const lang: SupportedLang = i18n.language?.startsWith("en") ? "en" : getLanguage();

  return (
    <View style={styles.wrap}>
      <Segmented<SupportedLang>
        label={t("common.language")}
        icon="globe"
        value={lang}
        testIDPrefix="onboarding-lang"
        onChange={(v) => {
          if (v !== lang) setLanguage(v);
        }}
        options={[
          { value: "fr", label: t("common.languageFr") },
          { value: "en", label: t("common.languageEn") },
        ]}
      />
      <Segmented<ThemePreference>
        label={t("onboarding.themeLabel")}
        icon="sun"
        value={theme}
        testIDPrefix="onboarding-theme"
        onChange={(v) => {
          setSaveError(false);
          setThemePreference(v).catch(() => setSaveError(true));
        }}
        options={[
          { value: "light", label: t("onboarding.themeLight"), icon: "sun" },
          { value: "dark", label: t("onboarding.themeDark"), icon: "moon" },
          { value: "system", label: t("onboarding.themeSystem"), icon: "smartphone" },
        ]}
      />
      {saveError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.destructive }]}
        >
          {t("onboarding.themeSaveError")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 380, alignSelf: "center", gap: 10, marginBottom: 14 },
  group: { gap: 6 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  track: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  option: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
  },
  error: { fontSize: 12, fontWeight: "600" },
  optionText: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
});
