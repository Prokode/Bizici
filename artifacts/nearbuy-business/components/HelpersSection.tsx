import React, { useState } from "react";
import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getListShopMembersQueryOptions,
  getListShopMembersQueryKey,
  useInviteShopMember,
  useRemoveShopMember,
  useCancelShopInvitation,
} from "@workspace/api-client-react";

export function HelpersSection({ shopId }: { shopId: string }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data, isLoading } = useQuery(getListShopMembersQueryOptions(shopId));
  const inviteMember = useInviteShopMember();
  const removeMember = useRemoveShopMember();
  const cancelInvite = useCancelShopInvitation();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListShopMembersQueryKey(shopId) });

  const handleInvite = () => {
    setInviteError(null);
    inviteMember.mutate(
      { shopId, data: { email: inviteEmail.trim().toLowerCase() } },
      {
        onSuccess: () => {
          setInviteEmail("");
          setInviteOpen(false);
          invalidate();
        },
        onError: (err: any) => setInviteError(err?.message ?? "Could not send invitation"),
      }
    );
  };

  const handleRemove = (userId: string, name: string) => {
    Alert.alert("Remove helper", `Remove ${name} from this shop?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMember.mutate({ shopId, userId }, { onSuccess: invalidate }),
      },
    ]);
  };

  const handleCancelInvite = (invitationId: string, email: string) => {
    Alert.alert("Cancel invitation", `Cancel invite for ${email}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel invite",
        style: "destructive",
        onPress: () =>
          cancelInvite.mutate({ shopId, invitationId }, { onSuccess: invalidate }),
      },
    ]);
  };

  return (
    <View style={{ marginTop: 24 }}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
          Helpers
        </Text>
        <TouchableOpacity onPress={() => setInviteOpen((v) => !v)}>
          <Feather name={inviteOpen ? "x" : "user-plus"} size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {inviteOpen && (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <Input
            label="Helper email"
            placeholder="helper@example.com"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {inviteError && <Text style={{ color: colors.destructive, fontSize: 13, marginBottom: 8 }}>{inviteError}</Text>}
          <Button
            title="Send invitation"
            disabled={!inviteEmail.includes("@") || inviteMember.isPending}
            loading={inviteMember.isPending}
            onPress={handleInvite}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            They'll see the invitation when they sign in to the app.
          </Text>
        </Card>
      )}

      {isLoading || !data ? (
        <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
      ) : (
        <Card style={{ padding: 0 }}>
          {data.members.length === 0 && data.invitations.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.mutedForeground }}>No helpers yet. Invite one above.</Text>
            </View>
          ) : null}

          {data.members.map((m, idx) => (
            <View key={m.userId} style={[styles.row, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarText, { color: colors.foreground }]}>
                  {(m.name || m.email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                  {m.name || m.email}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground }]}>{m.email}</Text>
              </View>
              <Badge variant={m.role === "seller" ? "default" : "secondary"} style={{ marginRight: 8 }}>
                {m.role === "seller" ? "Seller" : "Helper"}
              </Badge>
              {m.role !== "seller" && (
                <TouchableOpacity onPress={() => handleRemove(m.userId, m.name || m.email || "this helper")}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {data.invitations.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.row,
                (data.members.length > 0 || idx > 0) && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Feather name="mail" size={16} color={colors.accentForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                  {p.email}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground }]}>Pending invitation</Text>
              </View>
              <TouchableOpacity onPress={() => handleCancelInvite(p.id, p.email)}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 20 },
  hint: { fontSize: 12, marginTop: 8, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "600" },
  name: { fontSize: 15 },
  email: { fontSize: 12 },
});
