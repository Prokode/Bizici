import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useListCategories, type Category } from "@workspace/api-client-react";

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
};

export function CategoryPicker({ selectedIds, onChange, label = "Categories", kind }: Props) {
  const colors = useColors();
  const { data: categories, isLoading } = useListCategories(kind ? { kind } : undefined);

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
        {label}
      </Text>
      {isLoading ? (
        <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
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
});
