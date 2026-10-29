import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { ProductGallery } from "@/components/ProductGallery";
import { useCatalogLikes } from "@/lib/useCatalogLikes";
import type { ShopCurrency } from "@/lib/currency";
import { filterCatalogCategory, sortCatalogMostLiked, sortCatalogNewest } from "@/lib/catalogSections";

export type CatalogProduct = {
  id: string; name: string; description?: string | null; brand?: string | null;
  price: number; photos: string[]; stockStatus?: "in_stock" | "out_of_stock";
  categories?: { id: string; name: string }[]; createdAt?: string | null;
};
export type CatalogService = {
  id: string; title: string; description?: string | null; price: number | null;
  pricingType: "fixed" | "hourly" | "quote"; photos: string[];
  durationMinutes?: number | null; categories: { id: string; name: string }[];
  pricingOptions?: { label?: string | null; durationMinutes: number; price: number }[];
  effectiveServiceLocation?: "at_shop" | "at_customer" | "both"; createdAt?: string | null;
};

type Props = {
  shopId: string;
  returnTo: string;
  currency?: ShopCurrency | null;
  products?: CatalogProduct[];
  filteredProducts?: CatalogProduct[];
  services?: CatalogService[];
  productFiltersSlot?: React.ReactNode;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  formatPrice: (minor: number, currency?: ShopCurrency | null) => string;
  onAskProduct?: (item: CatalogProduct) => void;
  onAskService?: (item: CatalogService) => void;
};

export function ShopCatalog({
  shopId, returnTo, currency, products = [], filteredProducts = products, services = [], productFiltersSlot, selectedCategoryId,
  onSelectCategory, formatPrice, onAskProduct, onAskService,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const likes = useCatalogLikes(shopId, returnTo);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    [...products.flatMap((item) => item.categories ?? []), ...services.flatMap((item) => item.categories ?? [])]
      .forEach((category) => map.set(category.id, category.name));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, services]);
  const newestProducts = sortCatalogNewest(products).slice(0, 10);
  const newestServices = sortCatalogNewest(services).slice(0, 10);
  const likedProducts = sortCatalogMostLiked(products, (item) => likes.getLike("product", item.id)).slice(0, 10);
  const likedServices = sortCatalogMostLiked(services, (item) => likes.getLike("service", item.id)).slice(0, 10);
  const visibleProducts = filterCatalogCategory(filteredProducts, selectedCategoryId);
  const visibleServices = filterCatalogCategory(services, selectedCategoryId);
  const muted = { color: colors.mutedForeground };

  const section = (title: string, kind: "product" | "service", items: (CatalogProduct | CatalogService)[], horizontal = true, popular = false) => (
    <View style={styles.section} key={`${kind}-${title}`}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {items.length ? (
        horizontal ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {items.map((item) => renderCard(item as CatalogProduct & CatalogService, kind, true))}
        </ScrollView> : <View style={styles.grid}>{items.map((item) => renderCard(item as CatalogProduct & CatalogService, kind, false))}</View>
      ) : null}
      {!items.length && popular && !likes.isLoading && !likes.isError ? (
        <Text style={[styles.emptyHint, muted]}>{t("catalog.noLikes")}</Text>
      ) : null}
    </View>
  );

  function renderCard(item: CatalogProduct & CatalogService, kind: "product" | "service", compact: boolean) {
    const product = kind === "product";
    const title = product ? item.name : item.title;
    const itemKey = `${kind}:${item.id}`;
    const like = likes.getLike(kind, item.id);
    const offers = product ? [] : item.pricingOptions ?? [];
    const amount = product
      ? formatPrice(item.price, currency)
      : item.pricingType === "quote" ? t("search.onQuote")
        : item.price == null ? "—"
          : item.pricingType === "hourly" ? t("search.hourlyPrice", { price: formatPrice(item.price * 100, currency) })
            : formatPrice(item.price * 100, currency);
    const price = offers.length > 1 ? t("search.fromPrice", { price: amount }) : amount;
    const open = !!expanded[itemKey];
    const ask = () => product ? onAskProduct?.(item) : onAskService?.(item);
    return <View key={itemKey} style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      compact ? styles.railCard : styles.gridCard,
    ]}>
      <View style={styles.photoWrap}>
        <ProductGallery photos={item.photos ?? []} label={title} height={compact ? 138 : 132} />
      </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(like.likedByMe ? "catalog.unlike" : "catalog.like", { name: title })}
          accessibilityState={{ checked: like.likedByMe, disabled: likes.isPending(kind, item.id) }}
          disabled={likes.isPending(kind, item.id)}
          testID={`catalog-like-${kind}-${item.id}`}
          onPress={() => likes.toggle(kind, item.id)}
          style={({ pressed }) => [styles.heart, { backgroundColor: colors.background, opacity: pressed ? 0.72 : 1 }]}
        >
          <Ionicons name={like.likedByMe ? "heart" : "heart-outline"} size={18} color={like.likedByMe ? colors.primary : colors.foreground} />
          <Text style={[styles.likeCount, { color: colors.foreground }]}>{like.likeCount}</Text>
        </Pressable>
      <Text numberOfLines={2} style={[styles.itemTitle, { color: colors.foreground }]}>{title}</Text>
      {product && item.brand ? <Text numberOfLines={1} style={[styles.meta, muted]}>{item.brand}</Text> : null}
      {!!item.categories?.length ? <Text numberOfLines={1} style={[styles.meta, muted]}>{item.categories.map((category) => category.name).join(" · ")}</Text> : null}
      <Text numberOfLines={1} style={[styles.price, { color: colors.primary }]}>{price}</Text>
      {offers.map((offer, index) => (
        <View key={index} style={styles.offer} testID={`catalog-offer-${item.id}-${index}`}>
          {offer.label ? <Text style={[styles.meta, { color: colors.foreground }]}>{offer.label}</Text> : null}
          <Text style={[styles.description, { color: colors.foreground }]}>
            {t("shopDetails.duration", { minutes: offer.durationMinutes })} · {formatPrice(offer.price * 100, currency)}
          </Text>
        </View>
      ))}
      {product && item.stockStatus ? <Text style={[styles.meta, muted]}>{t(item.stockStatus === "in_stock" ? "shopDetails.inStock" : "shopDetails.outOfStock")}</Text> : null}
      {!product && item.effectiveServiceLocation ? <Text style={[styles.meta, muted]}>{t(`catalog.location.${item.effectiveServiceLocation}`)}</Text> : null}
      {item.description ? <>
        <Text numberOfLines={open ? undefined : 2} style={[styles.description, muted]}>{item.description}</Text>
        {item.description.length > 72 ? <Pressable accessibilityRole="button" onPress={() => setExpanded((prev) => ({ ...prev, [itemKey]: !open }))} hitSlop={6}>
          <Text style={[styles.more, { color: colors.primary }]}>{t(open ? "catalog.less" : "catalog.more")}</Text>
        </Pressable> : null}
      </> : null}
      {!offers.length && item.durationMinutes != null ? <Text style={[styles.meta, muted]}>{t("shopDetails.duration", { minutes: item.durationMinutes })}</Text> : null}
      {ask ? <Pressable accessibilityRole="button" testID={`catalog-ask-${kind}-${item.id}`} onPress={ask} style={[styles.askButton, { borderColor: colors.primary }]}>
        <Feather name="message-circle" size={14} color={colors.primary} style={{ flexShrink: 0 }} />
        <Text style={[styles.askText, { color: colors.primary }]}>{t(product ? "askItem.askProduct" : "askItem.askService")}</Text>
      </Pressable> : null}
    </View>;
  }

  return <View style={styles.root}>
    <View style={styles.headingRow}>
      <View><Text style={[styles.catalogTitle, { color: colors.foreground }]}>{t("catalog.title")}</Text>
        <Text style={[styles.catalogSubtitle, muted]}>{t("catalog.subtitle")}</Text></View>
      {(likes.isLoading || likes.isError) ? <Pressable accessibilityRole="button" accessibilityLabel={t("common.retry")} accessibilityState={{ disabled: likes.isLoading }} disabled={likes.isLoading} testID="catalog-likes-retry" onPress={() => likes.refetch()} style={styles.retry}>
        {likes.isLoading ? <View style={styles.loadingLikes}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.meta, muted]}>{t("catalog.likesLoading")}</Text></View> :
          <View style={styles.loadingLikes}><Feather name="refresh-cw" size={16} color={colors.primary} /><Text style={[styles.meta, muted]}>{t("catalog.likesError")}</Text></View>}
      </Pressable> : null}
    </View>
    {products.length > 0 && section(t("catalog.newProducts"), "product", newestProducts)}
    {services.length > 0 && section(t("catalog.newServices"), "service", newestServices)}
    {products.length > 0 && section(t("catalog.mostLikedProducts"), "product", likedProducts, true, true)}
    {services.length > 0 && section(t("catalog.mostLikedServices"), "service", likedServices, true, true)}
    {productFiltersSlot}
    <View style={styles.categoryBlock}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("catalog.browse")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {[{ id: "", name: t("catalog.all") }, ...categories].map((category) => {
          const selected = category.id === selectedCategoryId;
          return <Pressable key={category.id || "all"} accessibilityRole="button" accessibilityState={{ selected }}
            testID={`catalog-category-${category.id || "all"}`} onPress={() => onSelectCategory(category.id)}
            style={[styles.category, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
            <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: "700" }}>{category.name}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </View>
    {products.length > 0 ? section(t("catalog.allProducts"), "product", visibleProducts, false) : null}
    {services.length > 0 ? section(t("catalog.allServices"), "service", visibleServices, false) : null}
    {(products.length > 0 || services.length > 0) && visibleProducts.length === 0 && visibleServices.length === 0
      ? <Text style={[styles.emptyHint, muted]}>{t("shopProductFilters.noMatches")}</Text> : null}
    {!products.length && !services.length ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="grid" size={23} color={colors.mutedForeground} /><Text style={[styles.emptyHint, muted]}>{t("catalog.empty")}</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catalogTitle: { fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  catalogSubtitle: { fontSize: 13, marginTop: 3 },
  retry: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  loadingLikes: { flexDirection: "row", alignItems: "center", gap: 6 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  rail: { gap: 10, paddingRight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 10, gap: 6, overflow: "hidden" },
  railCard: { width: 214 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: { width: "48%", flexGrow: 0, flexBasis: "48%" },
  photoWrap: { position: "relative", borderRadius: 11, overflow: "hidden" },
  heart: { alignSelf: "flex-end", minWidth: 44, height: 44, paddingHorizontal: 8, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  likeCount: { fontSize: 12, fontWeight: "700" },
  itemTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700", minHeight: 36 },
  price: { fontSize: 14, fontWeight: "800" },
  offer: { gap: 2, paddingVertical: 3 },
  meta: { fontSize: 11, lineHeight: 15 },
  description: { fontSize: 12, lineHeight: 17 },
  more: { fontSize: 12, fontWeight: "700", paddingVertical: 3 },
  askButton: { width: "100%", minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 2 },
  askText: { fontSize: 12, fontWeight: "700", flexShrink: 1, minWidth: 0, lineHeight: 16, textAlign: "center" },
  categoryBlock: { gap: 9 },
  category: { minHeight: 44, paddingHorizontal: 15, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  empty: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center", gap: 8 },
  emptyHint: { fontSize: 13, lineHeight: 18 },
});
