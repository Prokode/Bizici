import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { PublicProduct } from "@/lib/api/shops";
import { emptyProductFilters, filterShopProducts, type ProductFilters } from "@/lib/shopProductFilters";

export function useShopProductFilters(products: PublicProduct[], shopId?: string) {
  const [filters, setFilters] = useState<ProductFilters>(emptyProductFilters);
  useEffect(() => { setFilters(emptyProductFilters); }, [shopId]);
  const filtered = useMemo(() => filterShopProducts(products, filters), [products, filters]);
  return { filters, setFilters, filtered };
}
export function ShopProductFilters({ products, filters, setFilters }: {
  products: PublicProduct[]; filters: ProductFilters; setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
}) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const { t } = useTranslation();
  const active = Object.values(filters).filter(Boolean).length;
  const categories = Array.from(new Map(products.flatMap(product => product.categories ?? []).map(c => [c.id, c])).values());
  const options = (key: "colors" | "sizes") => Array.from(new Set(products.flatMap(product => product[key] ?? [])))
    .map(value => ({ value, label: value }));
  return <View style={{ gap: 10, marginBottom: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
      onPress={() => setOpen(value => !value)}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: colors.muted, borderRadius: 12 }}>
      <Feather name="sliders" size={18} color={colors.primary} />
      <Text style={{ flex: 1, color: colors.foreground }}>{t("shopProductFilters.toggle")}{active ? ` (${active})` : ""}</Text>
      <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.foreground} />
    </Pressable>
    {open && <View>
      <Input label={t("shopProductFilters.name")} value={filters.name} onChangeText={name => setFilters(current => ({ ...current, name }))} />
      <Select label={t("shopProductFilters.category")} value={filters.category}
        options={[{ value: "", label: t("shopProductFilters.all") }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
        onChange={category => setFilters(current => ({ ...current, category }))} />
      <Select label={t("shopProductFilters.color")} value={filters.color}
        options={[{ value: "", label: t("shopProductFilters.all") }, ...options("colors")]}
        onChange={color => setFilters(current => ({ ...current, color }))} />
      <Select label={t("shopProductFilters.size")} value={filters.size}
        options={[{ value: "", label: t("shopProductFilters.all") }, ...options("sizes")]}
        onChange={size => setFilters(current => ({ ...current, size }))} />
      <Button title={t("shopProductFilters.reset")} variant="ghost" onPress={() => setFilters(emptyProductFilters)} />
    </View>}
  </View>;
}
