import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export interface SelectOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BaseSelectProps {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** When true, shows a search box at the top of the sheet. */
  searchable?: boolean;
  /** Sheet header title; defaults to `label`, then `placeholder`. */
  title?: string;
  containerStyle?: ViewStyle;
}

interface SingleSelectProps extends BaseSelectProps {
  multiple?: false;
  value: string | null | undefined;
  onChange: (value: string) => void;
}

interface MultiSelectProps extends BaseSelectProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type SelectProps = SingleSelectProps | MultiSelectProps;

/**
 * Global select / picker used across the customer app. Renders an `Input`-style
 * trigger that opens a themed bottom sheet with a tappable option list.
 *
 * - Single mode (default): tapping an option commits it and closes the sheet.
 * - Multiple mode (`multiple`): options toggle on/off and the user closes with
 *   the "Done" button; the trigger shows the joined labels.
 *
 * Pass `searchable` for long lists. All copy (placeholder, search, empty state,
 * done) falls back to shared `common.*` i18n keys when not provided. Options are
 * rendered with `FlatList` so long lists stay performant.
 */
export function Select(props: SelectProps) {
  const {
    options,
    label,
    placeholder,
    error,
    disabled,
    searchable,
    title,
    containerStyle,
  } = props;
  const colors = useColors();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const resolvedPlaceholder = placeholder ?? t("common.selectPlaceholder");

  const selectedValues = useMemo(
    () =>
      props.multiple
        ? props.value
        : props.value != null
          ? [props.value]
          : [],
    [props.multiple, props.value],
  );

  // Resolve against the actual option list so stale/unknown values don't count
  // as a selection (avoids placeholder text rendering in the "selected" color).
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedValues.includes(o.value)),
    [options, selectedValues],
  );

  const hasSelection = selectedOptions.length > 0;
  const triggerLabel = hasSelection
    ? selectedOptions.map((o) => o.label).join(", ")
    : resolvedPlaceholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || query.trim() === "") return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  const openSheet = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setQuery("");
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    Haptics.selectionAsync();
    if (props.multiple) {
      const next = selectedValues.includes(option.value)
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value];
      props.onChange(next);
    } else {
      props.onChange(option.value);
      closeSheet();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_500Medium",
            },
          ]}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? resolvedPlaceholder}
        accessibilityValue={hasSelection ? { text: triggerLabel } : undefined}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={[
          styles.trigger,
          {
            backgroundColor: disabled ? colors.muted : colors.background,
            borderColor: error ? colors.destructive : colors.input,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,
            {
              color: hasSelection ? colors.foreground : colors.mutedForeground,
              fontFamily: "PlusJakartaSans_400Regular",
            },
          ]}
        >
          {triggerLabel}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>

      {error && (
        <Text
          style={[
            styles.error,
            {
              color: colors.destructive,
              fontFamily: "PlusJakartaSans_400Regular",
            },
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
              <View
                style={[styles.handle, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.sheetHeader}>
              <Text
                style={[
                  styles.sheetTitle,
                  {
                    color: colors.foreground,
                    fontFamily: "PlusJakartaSans_700Bold",
                  },
                ]}
              >
                {title ?? label ?? resolvedPlaceholder}
              </Text>
              {props.multiple && (
                <TouchableOpacity
                  onPress={closeSheet}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.done")}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "PlusJakartaSans_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {t("common.done")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {searchable && (
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name="search"
                  size={18}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("common.search")}
                  placeholderTextColor={colors.mutedForeground}
                  accessibilityLabel={t("common.search")}
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
            )}

            <FlatList
              data={filteredOptions}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.value}
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
              renderItem={({ item: option }) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={option.disabled}
                    onPress={() => handleSelect(option)}
                    accessibilityRole={props.multiple ? "checkbox" : "button"}
                    accessibilityLabel={option.label}
                    accessibilityState={{
                      selected,
                      disabled: !!option.disabled,
                    }}
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                      option.disabled && { opacity: 0.4 },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      {option.icon && (
                        <View style={styles.optionIcon}>{option.icon}</View>
                      )}
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: selected
                            ? "PlusJakartaSans_600SemiBold"
                            : "PlusJakartaSans_400Regular",
                          fontSize: 16,
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {selected && (
                      <Feather name="check" size={20} color={colors.primary} />
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
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "75%",
    paddingBottom: 32,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 18,
    flex: 1,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionIcon: {
    width: 24,
    alignItems: "center",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 32,
    fontSize: 15,
  },
});
