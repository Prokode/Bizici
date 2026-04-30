import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import {
  getConversation,
  listMessages,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chatApi";
import {
  acceptAppointment,
  cancelAppointment,
  declineAppointment,
  listAppointments,
  type Appointment,
} from "@/lib/appointmentsApi";
import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentReviewModal } from "@/components/AppointmentReviewModal";
import { useTranslation } from "react-i18next";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function SellerChatThreadScreen() {
  const { conversationId, shopId } = useLocalSearchParams<{
    conversationId: string;
    shopId: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useUser();
  const [draft, setDraft] = useState("");
  const [reviewApptId, setReviewApptId] = useState<string | null>(null);
  const [pendingApptAction, setPendingApptAction] = useState<{
    id: string;
    kind: "accept" | "decline" | "cancel";
  } | null>(null);

  const conversationQuery = useQuery({
    queryKey: ["chat-conv", conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments-conv", conversationId],
    queryFn: () => listAppointments({ conversationId: conversationId! }),
    enabled: !!conversationId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const acceptMutation = useMutation({
    mutationFn: (apptId: string) => acceptAppointment(apptId),
    onMutate: (apptId) => setPendingApptAction({ id: apptId, kind: "accept" }),
    onSettled: () => setPendingApptAction(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-conv", conversationId] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
    },
    onError: (err: unknown) =>
      Alert.alert("NearBuy", err instanceof Error ? err.message : t("auth.errorGeneric")),
  });

  const declineMutation = useMutation({
    mutationFn: (apptId: string) => declineAppointment(apptId),
    onMutate: (apptId) => setPendingApptAction({ id: apptId, kind: "decline" }),
    onSettled: () => setPendingApptAction(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-conv", conversationId] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
    },
    onError: (err: unknown) =>
      Alert.alert("NearBuy", err instanceof Error ? err.message : t("auth.errorGeneric")),
  });

  const cancelMutation = useMutation({
    mutationFn: (apptId: string) => cancelAppointment(apptId),
    onMutate: (apptId) => setPendingApptAction({ id: apptId, kind: "cancel" }),
    onSettled: () => setPendingApptAction(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-conv", conversationId] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
    },
    onError: (err: unknown) =>
      Alert.alert("NearBuy", err instanceof Error ? err.message : t("auth.errorGeneric")),
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => listMessages(conversationId!, { limit: 100 }),
    enabled: !!conversationId,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!conversationId) return;
    if (messagesQuery.data?.messages?.length) {
      void markRead(conversationId).then(() => {
        void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
      });
    }
  }, [conversationId, messagesQuery.data?.messages?.length, qc]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendMessage(conversationId!, text),
    onSuccess: (msg) => {
      qc.setQueryData<{ messages: ChatMessage[]; hasMore: boolean }>(
        ["chat-messages", conversationId],
        (prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, msg] }
            : { messages: [msg], hasMore: false },
      );
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
      setDraft("");
    },
  });

  // API returns chronological (oldest → newest); inverted FlatList wants
  // newest first. Reverse once per query update.
  const invertedData = useMemo(
    () => (messagesQuery.data?.messages ?? []).slice().reverse(),
    [messagesQuery.data?.messages],
  );

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }, [draft, sendMutation]);

  const conversation = conversationQuery.data;
  const customerName =
    conversation?.customer.name ??
    conversation?.customer.email ??
    t("chat.customer");
  const customerEmail =
    conversation?.customer.email && conversation?.customer.name
      ? conversation.customer.email
      : null;

  const appointments = useMemo<Appointment[]>(() => {
    const arr = appointmentsQuery.data ?? [];
    const score = (s: Appointment["status"]) =>
      s === "proposed" ? 0 : s === "confirmed" ? 1 : s === "completed" ? 2 : 3;
    return [...arr].sort((a, b) => {
      const sa = score(a.status);
      const sb = score(b.status);
      if (sa !== sb) return sa - sb;
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    });
  }, [appointmentsQuery.data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.foreground }]}
          >
            {customerName}
          </Text>
          {customerEmail && (
            <Text
              numberOfLines={1}
              style={[styles.headerSubtitle, { color: colors.mutedForeground }]}
            >
              {customerEmail}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() =>
            router.push(
              `/shops/${shopId}/appointments` as never,
            )
          }
          hitSlop={12}
          style={{ paddingHorizontal: 4 }}
        >
          <Feather name="calendar" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      {appointments.length > 0 ? (
        <View style={styles.apptBand}>
          {appointments.map((a) => (
            <View key={a.id} style={{ marginBottom: 8 }}>
              <AppointmentCard
                appointment={a}
                myRole="seller"
                pendingAction={
                  pendingApptAction?.id === a.id ? pendingApptAction.kind : null
                }
                onAccept={() => acceptMutation.mutate(a.id)}
                onDecline={() =>
                  Alert.alert(
                    t("appointments.actions.decline"),
                    new Date(a.scheduledAt).toLocaleString(),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("appointments.actions.decline"),
                        style: "destructive",
                        onPress: () => declineMutation.mutate(a.id),
                      },
                    ],
                  )
                }
                onCancel={() =>
                  Alert.alert(
                    t("appointments.actions.cancel"),
                    new Date(a.scheduledAt).toLocaleString(),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("appointments.actions.cancel"),
                        style: "destructive",
                        onPress: () => cancelMutation.mutate(a.id),
                      },
                    ],
                  )
                }
                onReview={() => setReviewApptId(a.id)}
              />
            </View>
          ))}
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            inverted
            data={invertedData}
            keyExtractor={(m) => m.id}
            contentContainerStyle={
              invertedData.length === 0
                ? styles.listContentEmpty
                : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather
                  name="message-circle"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  {t("chat.noMessages")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.mine;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    { justifyContent: mine ? "flex-end" : "flex-start" },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? {
                            backgroundColor: colors.primary,
                            borderBottomRightRadius: 4,
                          }
                        : {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderBottomLeftRadius: 4,
                          },
                    ]}
                  >
                    <Text
                      style={{
                        color: mine
                          ? colors.primaryForeground
                          : colors.foreground,
                        fontSize: 15,
                        lineHeight: 20,
                      }}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={[
                        styles.bubbleTime,
                        {
                          color: mine
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                          opacity: mine ? 0.85 : 1,
                        },
                      ]}
                    >
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("chat.replyPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          />
          <Pressable
            disabled={!draft.trim() || sendMutation.isPending}
            onPress={onSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  !draft.trim() || sendMutation.isPending
                    ? colors.muted
                    : colors.primary,
              },
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Feather
                name="send"
                size={18}
                color={
                  !draft.trim() ? colors.mutedForeground : colors.primaryForeground
                }
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {reviewApptId && conversation ? (
        <AppointmentReviewModal
          visible={!!reviewApptId}
          appointmentId={reviewApptId}
          myRole="seller"
          meUserId={user?.id ?? ""}
          subjectLabel={customerName}
          onClose={() => setReviewApptId(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  apptBand: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 12, gap: 8 },
  listContentEmpty: { padding: 12, gap: 8, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  bubbleRow: { flexDirection: "row", marginVertical: 2 },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
