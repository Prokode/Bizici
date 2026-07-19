import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import {
  useListCities,
  useResolveCity,
  type City,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface CitySelectorProps {
  /** ISO 3166-1 alpha-2 of the country the city belongs to (from CountrySelector). */
  country: string | null | undefined;
  /** Selected city (display name) — null/undefined when none chosen yet. */
  value: City | null | undefined;
  onChange: (city: City) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Normalized city picker. The user types and picks from suggestions scoped to
 * the selected country (`GET /api/cities`); if the city is unknown, an
 * "Add «...»" row calls `POST /api/cities/resolve`, which normalizes and
 * dedupes server-side — raw free text is never stored. Disabled until a
 * country is selected.
 */
export function CitySelector({
  country,
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled,
  containerStyle,
}: CitySelectorProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current && clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(query), 250);
    return () => {
      timer.current && clearTimeout(timer.current);
    };
  }, [query]);

  const countryCode = (country ?? "").toUpperCase();
  const enabled = open && /^[A-Z]{2}$/.test(countryCode);

  const { data: cities = [], isFetching } = useListCities(
    { country: countryCode, q: debounced || undefined },
    { query: { enabled } as any },
  );
  const resolveCity = useResolveCity();

  const trimmed = query.trim();
  const canAdd = useMemo(() => {
    if (trimmed.length < 2 || trimmed.length > 64) return false;
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    return !cities.some((c) => norm(c.name) === norm(trimmed));
  }, [cities, trimmed]);

  const openSheet = () => {
    if (disabled || !countryCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setQuery("");
    setDebounced("");
  };

  const pick = (city: City) => {
    Haptics.selectionAsync();
    onChange(city);
    closeSheet();
  };

  const addCity = async () => {
    if (!canAdd || resolveCity.isPending) return;
    try {
      const city = await resolveCity.mutateAsync({
        data: { country: countryCode, name: trimmed },
      });
      pick(city);
    } catch {
      // Sheet stays open; the user can retry.
    }
  };

  const isDisabled = disabled || !countryCode;

  return (
    <View style={[styles.container, containerStyle]}>
      {label !== "" && (
        <Text
          style={[
            styles.label,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_500Medium" },
          ]}
        >
          {label ?? t("city.label")}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openSheet}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? t("city.label")}
        style={[
          styles.trigger,
          {
            backgroundColor: isDisabled ? colors.muted : colors.background,
            borderColor: error ? colors.destructive : colors.input,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Text
          style={{
            color: value ? colors.foreground : colors.mutedForeground,
            fontFamily: "PlusJakartaSans_400Regular",
            fontSize: 16,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {value?.name ??
            (countryCode
              ? (placeholder ?? t("city.placeholder"))
              : t("city.selectCountryFirst"))}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

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
                {t("city.label")}
              </Text>
              {isFetching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
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
                placeholder={t("city.searchPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel={t("city.searchPlaceholder")}
                style={[
                  styles.searchInput,
                  {
                    color: colors.foreground,
                    fontFamily: "PlusJakartaSans_400Regular",
                  },
                ]}
                autoCorrect={false}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <FlatList
              data={cities}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                !canAdd ? (
                  <Text
                    style={[
                      styles.empty,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "PlusJakartaSans_400Regular",
                      },
                    ]}
                  >
                    {trimmed.length >= 2
                      ? t("common.noResults")
                      : t("city.typeToSearch")}
                  </Text>
                ) : null
              }
              ListFooterComponent={
                canAdd ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={addCity}
                    disabled={resolveCity.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t("city.addCity", { name: trimmed })}
                    style={[styles.addRow, { borderColor: colors.primary }]}
                  >
                    {resolveCity.isPending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Feather name="plus-circle" size={18} color={colors.primary} />
                    )}
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        fontSize: 15,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {t("city.addCity", { name: trimmed })}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const selectedRow = value?.id === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => pick(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected: selectedRow }}
                    style={[styles.option, { borderBottomColor: colors.border }]}
                  >
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
                      {item.name}
                    </Text>
                    {selectedRow && (
                      <Feather name="check" size={18} color={colors.primary} />
                    )}
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
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
    gap: 8,
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
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  empty: { textAlign: "center", paddingVertical: 32, fontSize: 15 },
});
