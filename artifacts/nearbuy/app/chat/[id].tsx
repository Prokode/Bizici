import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/expo";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import {
  getConversation,
  listMessages,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/api/conversations";
import {
  cancelAppointment,
  completeAppointment,
  listAppointments,
  type Appointment,
} from "@/lib/api/appointments";
import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentBookingModal } from "@/components/AppointmentBookingModal";
import { AppointmentReviewModal } from "@/components/AppointmentReviewModal";
import { fetchProviderDetail } from "@/lib/api/providers";
import {
  itemReference,
  parseItemContext,
  type ChatItemContext,
} from "@/lib/chatItemContext";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{
    id: string;
    itemKind?: string;
    itemId?: string;
    itemName?: string;
  }>();
  const id = params.id;
  const ctxKind = params.itemKind;
  const ctxId = params.itemId;
  const ctxName = params.itemName;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [itemCtx, setItemCtx] = useState<ChatItemContext | null>(null);
  const [sendError, setSendError] = useState(false);
  // Key of the last route context applied, so rerenders / polling never
  // re-apply it, and the last auto-filled draft so user text is never
  // overwritten.
  const consumedCtxKey = useRef<string | null>(null);
  const lastPrefill = useRef<string>("");

  useEffect(() => {
    const parsed = parseItemContext({ itemKind: ctxKind, itemId: ctxId, itemName: ctxName });
    if (!parsed) {
      consumedCtxKey.current = null;
      return;
    }
    const key = `${id}|${parsed.kind}|${parsed.id}|${parsed.name}`;
    if (consumedCtxKey.current === key) return;
    consumedCtxKey.current = key;
    const prefill = t(parsed.kind === "product" ? "askItem.draftProduct" : "askItem.draftService");
    setItemCtx(parsed);
    setSendError(false);
    setDraft((d) => (!d.trim() || d === lastPrefill.current ? prefill : d));
    lastPrefill.current = prefill;
    // Drop the params so back-navigation / remounts don't resurrect old context.
    router.setParams({ itemKind: undefined, itemId: undefined, itemName: undefined });
  }, [id, ctxKind, ctxId, ctxName, t, router]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewApptId, setReviewApptId] = useState<string | null>(null);
  const [pendingApptAction, setPendingApptAction] = useState<{
    id: string;
    kind: "complete" | "cancel";
  } | null>(null);

  const conversationQuery = useQuery({
    queryKey: ["chat-conv", id],
    queryFn: () => getConversation(id!),
    enabled: !!id && !!isSignedIn,
  });

  // Lazily fetch the provider's public profile so the booking modal knows the
  // shop's default `serviceLocation` and each service's effective mode. We
  // only need it once the customer opens the modal — fetching always would
  // waste a request for product-only chats.
  const shopIdForBooking = conversationQuery.data?.shop.id;
  const providerDetailQuery = useQuery({
    queryKey: ["provider-detail", shopIdForBooking],
    // Returns null on 404 — product-only shops don't expose a provider profile,
    // so we treat it as "no execution-location metadata, default to at_shop".
    queryFn: async () => {
      try {
        return await fetchProviderDetail(shopIdForBooking!);
      } catch {
        return null;
      }
    },
    enabled: !!shopIdForBooking && bookingOpen,
    staleTime: 60_000,
    retry: false,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments-conv", id],
    queryFn: () => listAppointments({ conversationId: id! }),
    enabled: !!id && !!isSignedIn,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const completeMutation = useMutation({
    mutationFn: (apptId: string) => completeAppointment(apptId),
    onMutate: (apptId) => setPendingApptAction({ id: apptId, kind: "complete" }),
    onSettled: () => setPendingApptAction(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-conv", id] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
    },
    onError: (err: unknown) => {
      Alert.alert(
        "BizIci",
        err instanceof Error ? err.message : "Action impossible.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (apptId: string) => cancelAppointment(apptId),
    onMutate: (apptId) => setPendingApptAction({ id: apptId, kind: "cancel" }),
    onSettled: () => setPendingApptAction(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-conv", id] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
    },
    onError: (err: unknown) => {
      Alert.alert(
        "BizIci",
        err instanceof Error ? err.message : "Action impossible.",
      );
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => listMessages(id!, { limit: 100 }),
    enabled: !!id && !!isSignedIn,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // Mark read whenever new messages arrive (for the current user's side).
  useEffect(() => {
    if (!id || !isSignedIn) return;
    if (messagesQuery.data?.messages?.length) {
      void markRead(id).then(() => {
        void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
      });
    }
  }, [id, isSignedIn, messagesQuery.data?.messages?.length, qc]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendMessage(id!, text),
    onMutate: () => setSendError(false),
    onError: () => setSendError(true),
    onSuccess: (msg) => {
      qc.setQueryData<{ messages: ChatMessage[]; hasMore: boolean }>(
        ["chat-messages", id],
        (prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, msg] }
            : { messages: [msg], hasMore: false },
      );
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
      setDraft("");
      setItemCtx(null);
      lastPrefill.current = "";
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
    if (itemCtx) {
      const label = t(itemCtx.kind === "product" ? "askItem.productLabel" : "askItem.serviceLabel");
      const header = `[${label}: ${itemCtx.name} | ${itemReference(itemCtx)}]`;
      if (`${header}\n${text}`.length > 2000) {
        Alert.alert(t("askItem.messageTooLong"));
        return;
      }
      sendMutation.mutate(`${header}\n${text}`);
    } else {
      sendMutation.mutate(text);
    }
  }, [draft, sendMutation, itemCtx, t]);

  const conversation = conversationQuery.data;
  const otherTitle = conversation?.shop.name ?? "Discussion";
  const otherSubtitle =
    conversation?.myRole === "seller"
      ? (conversation?.customer.name ??
        conversation?.customer.email ??
        "Client")
      : (conversation?.shop.marketName ?? null);

  // The appointment list for this thread, sorted with the most relevant
  // (non-terminal) first so the user always sees what's actionable.
  const appointments = useMemo<Appointment[]>(() => {
    const arr = appointmentsQuery.data ?? [];
    const score = (s: Appointment["status"]) =>
      s === "proposed"
        ? 0
        : s === "confirmed"
          ? 1
          : s === "completed"
            ? 2
            : 3; // declined/cancelled at the bottom
    return [...arr].sort((a, b) => {
      const sa = score(a.status);
      const sb = score(b.status);
      if (sa !== sb) return sa - sb;
      return new Date(b.scheduledAt).getTime() -
        new Date(a.scheduledAt).getTime();
    });
  }, [appointmentsQuery.data]);

  const myRole: "customer" | "seller" =
    conversation?.myRole === "seller" ? "seller" : "customer";

  // For client→provider direction the customer NEVER appears as seller; so
  // for booking we only let the customer open the modal.
  const canPropose = myRole === "customer";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
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
            {otherTitle}
          </Text>
          {otherSubtitle && (
            <Text
              numberOfLines={1}
              style={[styles.headerSubtitle, { color: colors.mutedForeground }]}
            >
              {otherSubtitle}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push("/appointments" as never)}
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
                myRole={myRole}
                pendingAction={
                  pendingApptAction?.id === a.id
                    ? pendingApptAction.kind
                    : null
                }
                onComplete={() => completeMutation.mutate(a.id)}
                onCancel={() => {
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
                  );
                }}
                onReview={() => setReviewApptId(a.id)}
              />
            </View>
          ))}
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
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
                  {t("askItem.emptyThread")}
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

        {itemCtx || sendError ? (
          <View
            style={[
              styles.ctxWrap,
              { borderTopColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            {itemCtx ? (
              <View
                testID="chat-item-context"
                style={[styles.ctxCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
              >
                <Feather
                  name={itemCtx.kind === "product" ? "package" : "tool"}
                  size={18}
                  color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ctxLabel, { color: colors.mutedForeground }]}>
                    {t(itemCtx.kind === "product" ? "askItem.aboutProduct" : "askItem.aboutService")}
                  </Text>
                  <Text numberOfLines={2} style={[styles.ctxName, { color: colors.foreground }]}>
                    {itemCtx.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("askItem.removeContext")}
                  hitSlop={10}
                  disabled={sendMutation.isPending}
                  onPress={() => {
                    setItemCtx(null);
                    if (draft === lastPrefill.current) setDraft("");
                    lastPrefill.current = "";
                  }}
                >
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : null}
            {sendError ? (
              <Text style={[styles.ctxError, { color: colors.destructive }]}>
                {t("askItem.sendFailed")}
              </Text>
            ) : null}
          </View>
        ) : null}

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
          {canPropose ? (
            <Pressable
              onPress={() => setBookingOpen(true)}
              style={[
                styles.proposeBtn,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              hitSlop={6}
            >
              <Feather
                name="calendar"
                size={16}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
          <TextInput
            value={draft}
            editable={!sendMutation.isPending}
            onChangeText={setDraft}
            placeholder={t("askItem.composerPlaceholder")}
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

      {conversation && canPropose ? (
        <AppointmentBookingModal
          visible={bookingOpen}
          shopId={conversation.shop.id}
          shopName={conversation.shop.name}
          services={providerDetailQuery.data?.services.map((s) => ({
            id: s.id,
            title: s.title,
            effectiveServiceLocation: s.effectiveServiceLocation,
          }))}
          shopServiceLocation={
            providerDetailQuery.data?.provider?.serviceLocation ?? "at_shop"
          }
          onClose={() => setBookingOpen(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ["appointments-conv", id] });
          }}
        />
      ) : null}

      {reviewApptId && conversation ? (
        <AppointmentReviewModal
          visible={!!reviewApptId}
          appointmentId={reviewApptId}
          myRole={myRole}
          meUserId={
            // The review API resolves direction by role on the server, but
            // the modal needs the user's id to find their own existing
            // review. We don't have the api-server-side User._id directly,
            // so we use the Clerk user id and let the backend filter via
            // direction. The "from me?" comparison only matters for showing
            // the existing review — if not found we render a fresh one.
            user?.id ?? ""
          }
          subjectLabel={
            myRole === "customer"
              ? conversation.shop.name
              : conversation.customer.name ??
                conversation.customer.email ??
                "Client"
          }
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
  proposeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
  ctxWrap: { paddingHorizontal: 12, paddingTop: 10, gap: 6, borderTopWidth: 1 },
  ctxCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  ctxLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  ctxName: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  ctxError: { fontSize: 12 },
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
