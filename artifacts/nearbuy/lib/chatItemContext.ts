/**
 * Helpers for "Ask about this product/service". The selected item travels
 * through route params only (detail page -> /chat-shop resolver -> optional
 * sign-in `next` -> /chat/[id]). Everything is validated on each hop.
 */
export type ChatItemKind = "product" | "service";

export type ChatItemContext = {
  kind: ChatItemKind;
  id: string;
  name: string;
};

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const NAME_MAX = 120;

function first(v: unknown): string | undefined {
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : undefined;
  return typeof v === "string" ? v : undefined;
}

export function isValidRouteId(v: unknown): v is string {
  return typeof v === "string" && ID_RE.test(v);
}

export function sanitizeItemName(raw: string): string {
  // Strip control chars and brackets that would break the message header.
  return raw
    .replace(/[\u0000-\u001f\u007f[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

/** Parse untrusted route params into a context, or null if invalid/absent. */
export function parseItemContext(params: {
  itemKind?: unknown;
  itemId?: unknown;
  itemName?: unknown;
}): ChatItemContext | null {
  const kind = first(params.itemKind);
  const id = first(params.itemId);
  const rawName = first(params.itemName);
  if (kind !== "product" && kind !== "service") return null;
  if (!isValidRouteId(id) || typeof rawName !== "string") return null;
  const name = sanitizeItemName(rawName);
  if (!name) return null;
  return { kind, id, name };
}

function itemQuery(ctx: ChatItemContext | null): string {
  if (!ctx) return "";
  const p = [
    `itemKind=${encodeURIComponent(ctx.kind)}`,
    `itemId=${encodeURIComponent(ctx.id)}`,
    `itemName=${encodeURIComponent(sanitizeItemName(ctx.name))}`,
  ];
  return `?${p.join("&")}`;
}

/** Route to the conversation resolver, carrying the selected item. */
export function chatShopHref(shopId: string, ctx: ChatItemContext | null = null): string {
  return `/chat-shop/${encodeURIComponent(shopId)}${itemQuery(ctx)}`;
}

/** Route to a resolved conversation, carrying the selected item. */
export function chatThreadHref(conversationId: string, ctx: ChatItemContext | null = null): string {
  return `/chat/${encodeURIComponent(conversationId)}${itemQuery(ctx)}`;
}

/** Stable, machine-greppable reference included in the sent message text. */
export function itemReference(ctx: ChatItemContext): string {
  return `ref:${ctx.kind}:${ctx.id}`;
}
