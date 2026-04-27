import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";

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
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSignedIn } = useAuth();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const conversationQuery = useQuery({
    queryKey: ["chat-conv", id],
    queryFn: () => getConversation(id!),
    enabled: !!id && !!isSignedIn,
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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    },
  });

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }, [draft, sendMutation]);

  const conversation = conversationQuery.data;
  const otherTitle = conversation?.shop.name ?? "Discussion";
  const otherSubtitle =
    conversation?.myRole === "seller"
      ? (conversation?.customer.name ??
        conversation?.customer.email ??
        "Client")
      : (conversation?.shop.marketName ?? null);

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
      </View>

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
            ref={listRef}
            data={messagesQuery.data?.messages ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
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
                  Lancez la conversation : posez votre question !
                </Text>
              </View>
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
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
            placeholder="Votre message…"
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
  listContent: { padding: 12, gap: 8, flexGrow: 1 },
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
