import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useListCountries } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export interface PhoneValue {
  /** ISO 3166-1 alpha-2 of the chosen country, e.g. "FR". */
  country: string;
  /** International dialing prefix, e.g. "+33". */
  callingCode: string;
  /** Local digits only (no prefix). */
  nationalNumber: string;
  /** Convenience E.164-ish value: callingCode + nationalNumber. */
  e164: string;
}

interface PhoneInputProps {
  /** Default country (cca2) when none is selected yet. */
  defaultCountry?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  onChange?: (value: PhoneValue) => void;
}

/**
 * Phone number field with a country-code picker. The left button shows the
 * selected country's flag + dialing code and opens a searchable sheet; the
 * right field captures the local number. Countries come from the public
 * `/api/countries` endpoint.
 */
export function PhoneInput({
  defaultCountry = "FR",
  label,
  placeholder,
  error,
  disabled,
  containerStyle,
  onChange,
}: PhoneInputProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { data: countries = [] } = useListCountries();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [number, setNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const selected = useMemo(
    () => countries.find((c) => c.cca2 === countryCode),
    [countries, countryCode],
  );
  const callingCode = selected?.callingCode ?? "";

  const emit = (cca2: string, num: string) => {
    const sel = countries.find((c) => c.cca2 === cca2);
    const code = sel?.callingCode ?? "";
    const national = num.replace(/[^\d]/g, "");
    onChange?.({
      country: cca2,
      callingCode: code,
      nationalNumber: national,
      e164: `${code}${national}`,
    });
  };

  // The calling code is only known once countries finish loading. Re-emit when
  // it first becomes available so a parent never holds a stale (prefix-less)
  // value if the user typed before the data resolved.
  const lastEmittedCode = useRef<string>("");
  useEffect(() => {
    if (callingCode && callingCode !== lastEmittedCode.current) {
      lastEmittedCode.current = callingCode;
      emit(countryCode, number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callingCode]);

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        (lang === "fr" ? a.nameFr : a.name).localeCompare(
          lang === "fr" ? b.nameFr : b.name,
        ),
      ),
    [countries, lang],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedCountries;
    return sortedCountries.filter((c) => {
      const name = (lang === "fr" ? c.nameFr : c.name).toLowerCase();
      return name.includes(q) || c.callingCode.includes(q);
    });
  }, [sortedCountries, query, lang]);

  const openSheet = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setQuery("");
  };

  const pickCountry = (cca2: string) => {
    Haptics.selectionAsync();
    setCountryCode(cca2);
    emit(cca2, number);
    closeSheet();
  };

  const onChangeNumber = (text: string) => {
    setNumber(text);
    emit(countryCode, text);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_500Medium" },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.row,
          {
            backgroundColor: disabled ? colors.muted : colors.background,
            borderColor: error
              ? colors.destructive
              : isFocused
                ? colors.primary
                : colors.input,
            borderRadius: colors.radius,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openSheet}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={selected ? selected.name : t("country.label")}
          style={styles.codeButton}
        >
          {selected?.flagPng ? (
            <Image
              source={{ uri: selected.flagPng }}
              style={styles.flag}
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <Text
            style={[
              styles.codeText,
              {
                color: colors.foreground,
                fontFamily: "PlusJakartaSans_500Medium",
              },
            ]}
          >
            {callingCode || "—"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.input }]} />

        <TextInput
          value={number}
          onChangeText={onChangeNumber}
          editable={!disabled}
          keyboardType="phone-pad"
          placeholder={placeholder ?? t("phone.placeholder")}
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel={label ?? t("phone.label")}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.numberInput,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_400Regular",
            },
          ]}
        />
      </View>

      {error && (
        <Text
          style={[
            styles.error,
            { color: colors.destructive, fontFamily: "PlusJakartaSans_400Regular" },
          ]}
        >
          {error}
        </Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: colors.radius + 6,
                borderTopRightRadius: colors.radius + 6,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.sheetHeader}>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
                ]}
              >
                {t("country.label")}
              </Text>
            </View>

            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.muted, borderRadius: colors.radius },
              ]}
            >
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("country.searchPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel={t("country.searchPlaceholder")}
                style={[
                  styles.searchInput,
                  {
                    color: colors.foreground,
                    fontFamily: "PlusJakartaSans_400Regular",
                  },
                ]}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filtered}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.cca2}
              ListEmptyComponent={
                <Text
                  style={[
                    styles.empty,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "PlusJakartaSans_400Regular",
                    },
                  ]}
                >
                  {t("common.noResults")}
                </Text>
              }
              renderItem={({ item }) => {
                const selectedRow = item.cca2 === countryCode;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => pickCountry(item.cca2)}
                    accessibilityRole="button"
                    accessibilityLabel={lang === "fr" ? item.nameFr : item.name}
                    accessibilityState={{ selected: selectedRow }}
                    style={[styles.option, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.optionLeft}>
                      <Image
                        source={{ uri: item.flagPng }}
                        style={styles.flag}
                        accessibilityIgnoresInvertColors
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: selectedRow
                            ? "PlusJakartaSans_600SemiBold"
                            : "PlusJakartaSans_400Regular",
                          fontSize: 16,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {lang === "fr" ? item.nameFr : item.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "PlusJakartaSans_500Medium",
                        fontSize: 15,
                      }}
                    >
                      {item.callingCode}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  codeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  codeText: { fontSize: 16 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: 8 },
  numberInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  flag: { width: 24, height: 18, borderRadius: 2 },
  error: { fontSize: 12, marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: { maxHeight: "75%", paddingBottom: 32 },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sheetTitle: { fontSize: 18, flex: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  list: { flexGrow: 0, flexShrink: 1, paddingHorizontal: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  empty: { textAlign: "center", paddingVertical: 32, fontSize: 15 },
});
