export type ChatStartFailure = {
  reason: "ownShop" | "session" | "unavailable" | "forbidden" | "server" | "network";
  status?: number;
  retryable: boolean;
};

/** Map known API failures without exposing response bodies or credentials. */
export function chatStartFailure(error: unknown): ChatStartFailure {
  const candidate = error as { status?: unknown; data?: { error?: unknown } } | null;
  const status = typeof candidate?.status === "number" ? candidate.status : undefined;
  const message = candidate?.data?.error;
  if (status === 400 && typeof message === "string" &&
      message.startsWith("You are a member of this shop.")) {
    return { reason: "ownShop", status, retryable: false };
  }
  if (status === 401) return { reason: "session", status, retryable: true };
  if (status === 403) return { reason: "forbidden", status, retryable: false };
  if (status === 404 || status === 400) {
    return { reason: "unavailable", status, retryable: false };
  }
  return { reason: status ? "server" : "network", status, retryable: true };
}
