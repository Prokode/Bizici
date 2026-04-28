import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { Types } from "mongoose";

import { PushToken } from "@workspace/db";
import { logger } from "./logger";

// Single Expo client per process. Without an access token the SDK still works
// for unauthenticated production sends — the token is only required for
// higher rate limits & proper error reporting.
const expo = new Expo({
  accessToken: process.env["EXPO_ACCESS_TOKEN"],
});

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /**
   * Used by the OS to coalesce updates: a chat thread should reuse the same
   * thread id so successive notifications stack together rather than spam.
   */
  threadId?: string;
};

/**
 * Send a push to every registered device of the given users.
 *
 * Errors do NOT throw — this helper is designed to be called inside request
 * handlers where the user-facing response must succeed even if push delivery
 * fails. All errors are logged.
 *
 * Tokens that the Expo service reports as `DeviceNotRegistered` are pruned
 * from the database so we stop trying to deliver to dead devices.
 */
export async function sendPushToUsers(
  userIds: Array<string | Types.ObjectId>,
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const oids = userIds.map((u) =>
      typeof u === "string" ? new Types.ObjectId(u) : u,
    );
    const tokens = await PushToken.find({ userId: { $in: oids } })
      .select({ expoPushToken: 1, _id: 0 })
      .lean();
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const t of tokens) {
      const token = t.expoPushToken;
      if (!Expo.isExpoPushToken(token)) {
        // Bad token — nuke it so we never try again.
        await PushToken.deleteOne({ expoPushToken: token }).catch(() => null);
        continue;
      }
      messages.push({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        ...(payload.threadId ? { threadId: payload.threadId } : {}),
        priority: "high",
        channelId: "default",
      });
    }
    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
      try {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (err) {
        logger.error({ err }, "expo.sendPushNotificationsAsync failed");
      }
    }

    // Prune tokens whose tickets reported DeviceNotRegistered.
    await Promise.all(
      tickets.map(async (ticket, i) => {
        if (ticket.status !== "error") return;
        const code = ticket.details?.error;
        const target = messages[i]?.to;
        if (
          code === "DeviceNotRegistered" &&
          typeof target === "string"
        ) {
          await PushToken.deleteOne({ expoPushToken: target }).catch(() => null);
        } else {
          logger.warn({ ticket }, "Expo push ticket error");
        }
      }),
    );
  } catch (err) {
    logger.error({ err }, "sendPushToUsers failed");
  }
}
