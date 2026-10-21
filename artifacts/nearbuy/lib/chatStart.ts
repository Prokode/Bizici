import { getOrCreateConversation } from "./api/conversations";
import { isValidRouteId } from "./chatItemContext";

/** One deadline covers token retrieval, the request, and response-body parsing. */
export async function openShopConversation(
  shopId: string,
  getToken: () => Promise<string | null>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeoutMs = options.timeoutMs ?? 15_000;
  const timer = setTimeout(abort, timeoutMs);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const token = await new Promise<string | null>((resolve, reject) => {
      const stopped = () => reject(new Error("Conversation opening cancelled or timed out"));
      if (controller.signal.aborted) { stopped(); return; }
      controller.signal.addEventListener("abort", stopped, { once: true });
      Promise.resolve().then(getToken).then(resolve, reject).finally(() =>
        controller.signal.removeEventListener("abort", stopped));
    });
    if (!token) throw Object.assign(new Error("Sign in again to open the conversation"), { status: 401 });
    if (controller.signal.aborted) throw new Error("Conversation opening cancelled");
    const conversation = await getOrCreateConversation(shopId, token, { signal: controller.signal, timeoutMs });
    if (!conversation || !isValidRouteId(conversation.id)) throw new Error("Invalid conversation response");
    return conversation;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
