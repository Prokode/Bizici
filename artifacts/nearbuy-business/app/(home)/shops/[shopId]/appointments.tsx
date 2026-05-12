import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import { AppointmentCard } from "@/components/AppointmentCard";
import { listAppointments, type Appointment } from "@/lib/api/appointments";

export default function SellerAppointmentsListScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: ["appointments", "shop", shopId],
    queryFn: () => listAppointments(),
    enabled: !!isSignedIn,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const renderItem = ({ item }: { item: Appointment }) => (
    <Pressable
      onPress={() =>
        router.push(
          `/shops/${shopId}/chat/${item.conversationId}` as never,
        )
      }
      style={{ marginBottom: 12 }}
    >
      <AppointmentCard
        appointment={item}
        myRole="seller"
        variant="compact"
      />
    </Pressable>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.foreground }]}
        >
          {t("appointments.listTitle")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={
            (query.data ?? []).length === 0
              ? styles.listEmpty
              : styles.list
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather
                name="calendar"
                size={32}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                {t("appointments.empty")}
              </Text>
            </View>
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, padding: 24 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
