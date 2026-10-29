import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useListCategories, type Category } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  kind?: "product" | "service";
  serviceShopId?: string;
};

/**
 * Catalog-side category selector. The optional shop id keeps the prop shape
 * aligned with the merchant picker; category creation remains merchant-only.
 */
export function CategoryPicker({ selectedIds, onChange, label, kind }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const { data: categories, isLoading } = useListCategories(kind ? { kind } : undefined);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id]);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
        {label ?? t("addProduct.categories")}
      </Text>
      {isLoading ? (
        <Text style={{ color: colors.mutedForeground }}>{t("common.loading")}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(categories ?? []).map((category: Category) => {
            const selected = selectedIds.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => toggle(category.id)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.muted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{
                  color: selected ? colors.primaryForeground : colors.foreground,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 14,
                }}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
