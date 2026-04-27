import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getListProductsQueryOptions,
  getListProductsQueryKey,
  getGetShopSummaryQueryKey,
  useUpdateProduct,
  type Product,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSummary } from "@/components/HeaderSummary";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const {
    data: products,
    isLoading: isProductsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    ...getListProductsQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const updateProduct = useUpdateProduct();

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
      "No category";
    return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        {firstPhoto ? (
          <Image
            source={{ uri: firstPhoto }}
            style={[styles.thumb, { borderRadius: colors.radius, backgroundColor: colors.muted }]}
          />
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
          {item.price != null ? `$${(item.price / 100).toFixed(2)}` : "Price not set"}
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
            {item.stockStatus === "in_stock" ? "In Stock" : "Out of Stock"}
          </Badge>
        </View>
      </View>
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
              Your inventory is empty
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Add your first product so customers nearby can discover your shop.
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
          Add Product
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
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
