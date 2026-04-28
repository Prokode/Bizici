import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { useColors } from "@/hooks/useColors";
import {
  getConversation,
  listMessages,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chatApi";

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
  const { conversationId } = useLocalSearchParams<{
    conversationId: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const conversationQuery = useQuery({
    queryKey: ["chat-conv", conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
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
    "Customer";
  const customerEmail =
    conversation?.customer.email && conversation?.customer.name
      ? conversation.customer.email
      : null;

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
      </View>

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
                  No messages yet.
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
            placeholder="Reply to customer…"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
