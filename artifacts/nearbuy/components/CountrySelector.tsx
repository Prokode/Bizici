import React, { useMemo } from "react";
import { Image, StyleSheet, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useListCountries } from "@workspace/api-client-react";
import { Select } from "@/components/ui/Select";

interface CountrySelectorProps {
  /** Selected country as an ISO 3166-1 alpha-2 code (e.g. "FR"). */
  value: string | null | undefined;
  onChange: (cca2: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Country picker backed by the public `/api/countries` endpoint. Renders a
 * searchable sheet (via the shared `Select`) with a flag next to each country
 * name, localized to the active language (FR/EN).
 */
export function CountrySelector({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled,
  containerStyle,
}: CountrySelectorProps) {
  const { t, i18n } = useTranslation();
  const { data: countries = [], isLoading } = useListCountries();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const options = useMemo(
    () =>
      countries
        .map((c) => ({
          label: lang === "fr" ? c.nameFr : c.name,
          value: c.cca2,
          icon: (
            <Image
              source={{ uri: c.flagPng }}
              style={styles.flag}
              accessibilityIgnoresInvertColors
            />
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [countries, lang],
  );

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      label={label ?? t("country.label")}
      placeholder={
        isLoading ? t("common.loading") : (placeholder ?? t("country.placeholder"))
      }
      title={t("country.label")}
      searchable
      error={error}
      disabled={disabled || isLoading}
      containerStyle={containerStyle}
    />
  );
}

const styles = StyleSheet.create({
  flag: {
    width: 24,
    height: 18,
    borderRadius: 2,
  },
});
