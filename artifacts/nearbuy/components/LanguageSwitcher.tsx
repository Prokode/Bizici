import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { setLanguage, type SupportedLang } from "@/lib/i18n";

export function LanguageSwitcher() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "fr") as SupportedLang;

  const handleChange = async (lang: SupportedLang) => {
    if (lang !== current) await setLanguage(lang);
  };

  const renderOption = (lang: SupportedLang, label: string) => {
    const active = current === lang;
    return (
      <Pressable
        key={lang}
        onPress={() => handleChange(lang)}
        style={[
          styles.option,
          {
            backgroundColor: active ? colors.primary : "transparent",
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.optionText,
            { color: active ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Feather name="globe" size={18} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("common.language")}
        </Text>
      </View>
      <View style={styles.row}>
        {renderOption("fr", t("common.languageFr"))}
        {renderOption("en", t("common.languageEn"))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  optionText: { fontSize: 13, fontWeight: "600" },
});
