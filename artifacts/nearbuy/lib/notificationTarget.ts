/** Allowlisted routes only: never treat push data as a navigation URL. */
export function notificationTarget(data: Record<string, unknown> | undefined): string | null {
  const valid = (value: unknown): value is string => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
  if (data?.type === "chat_message" && valid(data.conversationId)) return `/chat/${data.conversationId}`;
  if (data?.type === "catalog_change" && valid(data.shopId)) {
    return data.itemKind === "service" ? `/provider/${data.shopId}` : `/shop/${data.shopId}`;
  }
  return null;
}
