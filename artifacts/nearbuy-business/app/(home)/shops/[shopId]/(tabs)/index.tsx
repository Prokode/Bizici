import React, { useState } from "react";
import { ProductGallery } from "@/components/ProductGallery";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getListProductsQueryOptions,
  getListProductsQueryKey,
  getGetShopQueryOptions,
  getGetShopSummaryQueryKey,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import { useShopId } from "@/hooks/useShopId";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSummary } from "@/components/HeaderSummary";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { formatShopPrice } from "@/lib/currency";

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const shopId = useShopId();

  const {
    data: products,
    isLoading: isProductsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    ...getListProductsQueryOptions(shopId as string),
    enabled: !!shopId,
  });
  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(home)/shops/[shopId]/add-product", params: { shopId: shopId as string, productId: id } });
  };

  const performDelete = (item: Product) => {
    if (deletingId) return;
    setDeletingId(item.id);
    setDeleteErrorId(null);
    const queryKey = getListProductsQueryKey(shopId as string);
    deleteProduct.mutate(
      { shopId: shopId as string, id: item.id },
      {
        onSuccess: () => {
          queryClient.setQueryData(queryKey, (old: Product[] | undefined) => old?.filter((p) => p.id !== item.id));
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: getGetShopSummaryQueryKey(shopId as string) });
        },
        onError: () => {
          setDeleteErrorId(item.id);
          Alert.alert(t("common.error"), t("inventory.deleteError"));
        },
        onSettled: () => setDeletingId(null),
      }
    );
  };

  const confirmDelete = (item: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const title = t("inventory.deleteTitle");
    const message = t("inventory.deleteMessage", { name: item.name });
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) performDelete(item);
      return;
    }
    Alert.alert(title, message, [
      { text: t("inventory.cancel"), style: "cancel" },
      { text: t("inventory.delete"), style: "destructive", onPress: () => performDelete(item) },
    ]);
  };

  const handleToggleStock = (id: string, currentStock: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStatus = currentStock === "in_stock" ? "out_of_stock" : "in_stock";
    const queryKey = getListProductsQueryKey(shopId as string);

    queryClient.setQueryData(queryKey, (old: Product[] | undefined) => {
      if (!old) return old;
      return old.map((p) => (p.id === id ? { ...p, stockStatus: newStatus as Product["stockStatus"] } : p));
    });

    updateProduct.mutate(
      { shopId: shopId as string, id, data: { stockStatus: newStatus as Product["stockStatus"] } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetShopSummaryQueryKey(shopId as string) }),
        onError: () => queryClient.invalidateQueries({ queryKey }),
      }
    );
  };

  const renderItem = ({ item }: { item: Product }) => {
    const firstPhoto = item.photos?.[0] ?? item.imageUrl ?? null;
    const categoryLabel =
      (item.categories && item.categories.length > 0 && item.categories.map((c) => c.name).join(", ")) ||
      item.category ||
      t("inventory.noCategory");
    return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        {firstPhoto ? (
          <View style={[styles.thumb, { borderRadius: colors.radius, backgroundColor: colors.muted }]}>
            <ProductGallery photos={item.photos?.length ? item.photos : [firstPhoto]} label={item.name} height={56} />
          </View>
        ) : null}
        <View style={styles.cardTitleArea}>
          {item.brand ? (
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "PlusJakartaSans_500Medium",
                fontSize: 12,
                marginBottom: 2,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {item.brand}
            </Text>
          ) : null}
          <Text style={[styles.productName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            {categoryLabel}
          </Text>
        </View>
        <Text style={[styles.productPrice, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
          {item.price != null
            ? formatShopPrice(item.price, shop?.currency, i18n.language)
            : t("inventory.priceNotSet")}
        </Text>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {item.tags.map((tag) => (
            <View key={tag} style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.stockToggle}>
          <Switch
            value={item.stockStatus === "in_stock"}
            onValueChange={() => handleToggleStock(item.id, item.stockStatus)}
            trackColor={{ false: colors.muted, true: colors.success || colors.primary }}
            thumbColor={colors.background}
          />
          <Badge variant={item.stockStatus === "in_stock" ? "success" : "destructive"} style={{ marginLeft: 8 }}>
            {item.stockStatus === "in_stock" ? t("inventory.inStock") : t("inventory.outOfStock")}
          </Badge>
        </View>
        <View style={styles.itemActions}>
          <Button
            title={t("inventory.edit")}
            variant="secondary"
            size="sm"
            numberOfLines={1}
            accessibilityLabel={t("inventory.editA11y", { name: item.name })}
            icon={<Feather name="edit-2" size={16} color={colors.secondaryForeground} />}
            disabled={deletingId === item.id}
            onPress={() => handleEdit(item.id)}
            style={styles.itemActionBtn}
          />
          <Button
            title={t("inventory.delete")}
            variant="outline"
            size="sm"
            numberOfLines={1}
            accessibilityLabel={t("inventory.deleteA11y", { name: item.name })}
            icon={<Feather name="trash-2" size={16} color={colors.destructive} />}
            textStyle={{ color: colors.destructive }}
            loading={deletingId === item.id}
            disabled={!!deletingId && deletingId !== item.id}
            onPress={() => confirmDelete(item)}
            style={{ ...styles.itemActionBtn, borderColor: colors.destructive }}
          />
        </View>
      </View>
      {deleteErrorId === item.id && (
        <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 8, fontSize: 13 }}>
          {t("inventory.deleteError")}
        </Text>
      )}
    </Card>
    );
  };

  if (!shopId) return null;

  if (isProductsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Skeleton height={100} style={{ marginBottom: 16 }} />
          <Skeleton height={100} style={{ marginBottom: 16 }} />
          <Skeleton height={100} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={`${deletingId}:${deleteErrorId}`}
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" && { paddingTop: 67, paddingBottom: 84 + 100 },
          Platform.OS !== "web" && { paddingBottom: 100 },
        ]}
        ListHeaderComponent={<HeaderSummary shopId={shopId as string} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {t("inventory.emptyTitle")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              {t("inventory.emptyHint")}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: (Platform.OS === "web" ? 84 : insets.bottom + 60) + 16 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(home)/shops/${shopId}/add-product`);
        }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
          {t("inventory.addProduct")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  card: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  thumb: { width: 56, height: 56, marginRight: 12 },
  cardTitleArea: { flex: 1, paddingRight: 16 },
  productName: { fontSize: 18, marginBottom: 4 },
  productCategory: { fontSize: 14 },
  productPrice: { fontSize: 18 },
  cardFooter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", rowGap: 12, columnGap: 8 },
  itemActions: { flexDirection: "row", gap: 8, flexGrow: 1, justifyContent: "flex-end" },
  itemActionBtn: { minHeight: 40, minWidth: 96, flexShrink: 1 },
  stockToggle: { flexDirection: "row", alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, marginBottom: 8, textAlign: "center" },
  emptyDesc: { fontSize: 16, textAlign: "center" },
  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: { marginLeft: 8, fontSize: 16 },
});
