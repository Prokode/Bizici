import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGetShopQueryOptions,
  getListProductsQueryOptions,
  useUpdateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { router } from "expo-router";
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

  const { data: shop, isLoading: isShopLoading, isError: isShopError } = useQuery({
    ...getGetShopQueryOptions(),
    retry: false,
  });

  const {
    data: products,
    isLoading: isProductsLoading,
    refetch,
    isRefetching,
  } = useQuery(getListProductsQueryOptions({ query: { enabled: !!shop } }));

  const updateProduct = useUpdateProduct();

  useEffect(() => {
    if (!isShopLoading && !shop && !isShopError) {
      router.replace("/onboarding");
    }
  }, [shop, isShopLoading, isShopError]);

  if (isShopLoading) {
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

  if (!shop) return null;

  const handleToggleStock = (id: string, currentStock: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newStatus = currentStock === "in_stock" ? "out_of_stock" : "in_stock";

    // Optimistic update
    queryClient.setQueryData(getListProductsQueryKey(), (old: any) => {
      if (!old) return old;
      return old.map((p: any) => (p.id === id ? { ...p, stockStatus: newStatus } : p));
    });

    updateProduct.mutate(
      { id, data: { stockStatus: newStatus } },
      {
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
      }
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.productName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            {item.category || "No category"}
          </Text>
        </View>
        <Text style={[styles.productPrice, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
          {item.price != null ? `$${(item.price / 100).toFixed(2)}` : "Price not set"}
        </Text>
      </View>
      
      {item.tags && item.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {item.tags.map((tag: string) => (
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" && { paddingTop: 67, paddingBottom: 84 + 100 },
          !Platform.OS && { paddingBottom: 100 },
        ]}
        ListHeaderComponent={<HeaderSummary />}
        ListEmptyComponent={
          isProductsLoading ? null : (
            <View style={styles.emptyContainer}>
              <Feather name="package" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                Your inventory is empty
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                Add your first product so customers nearby can discover your shop.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      />
      
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: (Platform.OS === "web" ? 84 : insets.bottom + 60) + 16 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/add-product");
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
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitleArea: {
    flex: 1,
    paddingRight: 16,
  },
  productName: {
    fontSize: 18,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
  },
  productPrice: {
    fontSize: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: "center",
  },
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
  fabText: {
    marginLeft: 8,
    fontSize: 16,
  },
});