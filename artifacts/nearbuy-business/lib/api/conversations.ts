/**
 * Typed wrapper around the auth-required chat endpoints of the NearBuy
 * api-server (`/api/conversations` + nested `/messages`). Uses `customFetch`
 * so it inherits the base URL + Clerk Bearer-token getter registered in the
 * root layout.
 */
import { customFetch } from "@workspace/api-client-react";

export type ChatRole = "customer" | "seller";

export type ConversationSummary = {
  id: string;
  shop: { id: string; name: string; marketName: string | null };
  customer: { id: string; name: string | null; email: string | null };
  lastMessageAt: string;
  lastMessageText: string;
  lastMessageSenderRole: ChatRole | null;
  unreadCount: number;
  myRole: ChatRole;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: ChatRole;
  text: string;
  createdAt: string;
  mine: boolean;
};

export async function listConversations(): Promise<ConversationSummary[]> {
  const data = await customFetch<{ conversations: ConversationSummary[] }>(
    "/api/conversations",
    { method: "GET" },
  );
  return data.conversations;
}

export async function getConversation(
  id: string,
): Promise<ConversationSummary> {
  const data = await customFetch<{ conversation: ConversationSummary }>(
    `/api/conversations/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  return data.conversation;
}

export async function getOrCreateConversation(
  shopId: string,
): Promise<ConversationSummary> {
  const data = await customFetch<{ conversation: ConversationSummary }>(
    "/api/conversations",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shopId }),
    },
  );
  return data.conversation;
}

export async function listMessages(
  conversationId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (opts.before) params.set("before", opts.before);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return customFetch<{ messages: ChatMessage[]; hasMore: boolean }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages${qs}`,
    { method: "GET" },
  );
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  const data = await customFetch<{ message: ChatMessage }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
  return data.message;
}

export async function markRead(conversationId: string): Promise<void> {
  await customFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      method: "POST",
    },
  );
}
