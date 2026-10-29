import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";
import {
  useCreateServiceCategory,
  useListCategories,
  getListCategoriesQueryKey,
  type Category,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  /**
   * Optional kind filter: when set the picker only fetches categories of that
   * kind (e.g. "service" for the services CRUD form, "product" for products).
   * When unset, falls back to the legacy behaviour of listing every category.
   */
  kind?: "product" | "service";
  serviceShopId?: string;
};

export function CategoryPicker({ selectedIds, onChange, label, kind, serviceShopId }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListCategories(kind ? { kind } : undefined);
  const createCategory = useCreateServiceCategory();
  const [categoryName, setCategoryName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const canCreateServiceCategory = kind === "service" && !!serviceShopId?.trim();

  const createServiceCategory = () => {
    const name = categoryName.trim();
    if (!serviceShopId || !name || createCategory.isPending) return;
    setCreateError(null);
    createCategory.mutate(
      { shopId: serviceShopId, data: { name } },
      {
        onSuccess: (created) => {
          const key = getListCategoriesQueryKey({ kind: "service" });
          queryClient.setQueryData<Category[]>(key, (previous) => {
            const current = previous ?? [];
            return current.some((category) => category.id === created.id)
              ? current
              : [...current, created];
          });
          onChange(selectedIds.includes(created.id) ? selectedIds : [...selectedIds, created.id]);
          setCategoryName("");
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
        onError: () => setCreateError(t("categoryPicker.createError")),
      },
    );
  };

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" },
        ]}
      >
        {label ?? t("addProduct.categories")}
      </Text>
      {isLoading ? (
        <Text style={{ color: colors.mutedForeground }}>{t("common.loading")}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {(categories ?? []).map((cat: Category) => {
            const selected = selectedIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggle(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.muted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: selected ? colors.primaryForeground : colors.foreground,
                    fontFamily: "PlusJakartaSans_500Medium",
                    fontSize: 14,
                  }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {canCreateServiceCategory ? (
        <View style={styles.createCategory}>
          <Text style={[styles.createTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
            {t("categoryPicker.createTitle")}
          </Text>
          <View style={styles.createRow}>
            <View style={styles.createInput}>
              <Input
                label=""
                placeholder={t("categoryPicker.namePlaceholder")}
                value={categoryName}
                onChangeText={setCategoryName}
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={createServiceCategory}
              />
            </View>
            <Button
              title={createCategory.isPending ? t("categoryPicker.creating") : t("categoryPicker.create")}
              onPress={createServiceCategory}
              disabled={!categoryName.trim() || createCategory.isPending}
              loading={createCategory.isPending}
              size="sm"
            />
          </View>
          {createError ? <Text style={[styles.createError, { color: colors.destructive }]}>{createError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  createCategory: { marginTop: 12 },
  createTitle: { fontSize: 13, marginBottom: 8 },
  createRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  createInput: { flex: 1 },
  createError: { fontSize: 13, marginTop: -8, marginBottom: 8 },
});
