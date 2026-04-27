import React from "react";
import { StyleSheet, Text, View, FlatList, RefreshControl, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListNearbyRequestsQueryOptions,
  getListNearbyRequestsQueryKey,
  useMarkRequestFound,
  useExpireRequest,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Feather } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: requests, isLoading, refetch, isRefetching } = useQuery(getListNearbyRequestsQueryOptions());

  const markRequestFound = useMarkRequestFound();
  const expireRequest = useExpireRequest();

  const handleAction = (id: string, action: "confirm" | "dismiss") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Optimistic removal
    queryClient.setQueryData(getListNearbyRequestsQueryKey(), (old: any) => {
      if (!old) return old;
      return old.filter((r: any) => r.id !== id);
    });

    const mutation = action === "confirm" ? markRequestFound : expireRequest;
    
    mutation.mutate({ id }, {
      onError: () => {
        queryClient.invalidateQueries({ queryKey: getListNearbyRequestsQueryKey() });
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const distanceText = item.distanceMeters < 1000 
      ? `${Math.round(item.distanceMeters)}m away`
      : `${(item.distanceMeters / 1000).toFixed(1)}km away`;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
            <Feather name="search" size={24} color={colors.accentForeground} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.query, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              "{item.query}"
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
                {distanceText}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Dismiss"
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => handleAction(item.id, "dismiss")}
          />
          <Button
            title="Confirm Availability"
            variant="primary"
            style={[styles.actionBtn, { backgroundColor: colors.success || colors.primary }]}
            textStyle={{ color: colors.successForeground || colors.primaryForeground }}
            onPress={() => handleAction(item.id, "confirm")}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={requests || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === "web" && { paddingTop: 67 + 16, paddingBottom: 84 + 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.muted }]}>
                <Feather name="radio" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                No Live Requests
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                When customers nearby search for products, their requests will appear here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  query: {
    fontSize: 18,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});