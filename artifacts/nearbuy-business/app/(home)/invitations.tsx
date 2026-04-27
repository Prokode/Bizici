import React from "react";
import { StyleSheet, Text, View, FlatList, Alert } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getListMyInvitationsQueryOptions,
  getListMyInvitationsQueryKey,
  getListShopsQueryKey,
  useAcceptInvitation,
  type PendingInvitation,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

export default function InvitationsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: invitations, isLoading } = useQuery(getListMyInvitationsQueryOptions());
  const acceptInvitation = useAcceptInvitation();

  const handleAccept = (invite: PendingInvitation) => {
    acceptInvitation.mutate(
      { token: invite.token },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListMyInvitationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          router.replace(`/(home)/shops/${result.shop.id}`);
        },
        onError: (err: any) => {
          Alert.alert("Could not accept invitation", err?.message ?? "Please try again later");
        },
      }
    );
  };

  if (isLoading) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={invitations || []}
        keyExtractor={(item) => item.token}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.accent }]}>
                <Feather name="mail" size={20} color={colors.accentForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shopName, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                  {item.shopName}
                </Text>
                <Text style={[styles.role, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_500Medium" }]}>
                  Invited as {item.role === "seller" ? "Seller" : "Helper"}
                </Text>
              </View>
            </View>
            <Button
              title="Accept invitation"
              onPress={() => handleAccept(item)}
              loading={acceptInvitation.isPending}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
              No pending invitations
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
              When a seller invites you to help with a shop, it'll show up here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { padding: 16, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  shopName: { fontSize: 17, marginBottom: 2 },
  role: { fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, marginBottom: 8, textAlign: "center" },
  emptyDesc: { fontSize: 16, textAlign: "center", lineHeight: 22 },
});
