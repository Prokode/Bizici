import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useListCategories } from "@workspace/api-client-react";

export function InterestPicker({ selected, onToggle, compact = false }: { selected: string[]; onToggle: (id: string) => void; compact?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const productQuery = useListCategories({ kind: "product" });
  const serviceQuery = useListCategories({ kind: "service" });
  const categories = [...(productQuery.data ?? []), ...(serviceQuery.data ?? [])];
  if (productQuery.isLoading || serviceQuery.isLoading) return <ActivityIndicator color={colors.primary} />;
  if (productQuery.isError || serviceQuery.isError) return <Pressable accessibilityRole="button" onPress={() => { void productQuery.refetch(); void serviceQuery.refetch(); }}><Text style={{ color: colors.destructive, fontWeight: "600" }}>{t("social.categoryError")} · {t("common.retry")}</Text></Pressable>;
  return (
    <View style={styles.wrap}>
      {(["product", "service"] as const).map((kind) => {
        const group = categories.filter((category) => category.kind === kind);
        if (!group.length) return null;
        return <View key={kind} style={styles.group}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t(`social.${kind}s`)}</Text>
          <View style={styles.tags}>{group.map((category) => {
            const active = selected.includes(category.id);
            return <Pressable key={category.id} onPress={() => onToggle(category.id)} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={category.name} testID={`interest-${category.id}`} style={[styles.tag, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border, paddingVertical: compact ? 8 : 11 }]}>
              {active && <Feather name="check" size={14} color={colors.primaryForeground} />}
              <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: "600" }}>{category.name}</Text>
            </Pressable>;
          })}</View>
        </View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  group: { gap: 9 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13 },
});
