import { Types } from "mongoose";
import {
  Appointment,
  AppointmentReview,
  Conversation,
  Shop,
  User,
} from "@workspace/db";

/**
 * Recompute the appointment-based rating aggregates for a service provider.
 * Reads all `client_to_provider` reviews for the shop and writes the average
 * + count back onto `Shop.serviceProvider`.
 */
export async function recomputeProviderAppointmentRating(
  shopId: Types.ObjectId | string,
): Promise<void> {
  const shopOid =
    shopId instanceof Types.ObjectId ? shopId : new Types.ObjectId(shopId);

  const [agg] = await AppointmentReview.aggregate<{
    _id: null;
    avg: number;
    count: number;
  }>([
    { $match: { shopId: shopOid, direction: "client_to_provider" } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.avg ?? 0;
  const count = agg?.count ?? 0;

  await Shop.updateOne(
    { _id: shopOid },
    {
      $set: {
        "serviceProvider.appointmentRating": Math.round(avg * 100) / 100,
        "serviceProvider.appointmentReviewsCount": count,
      },
    },
  );
}

/**
 * Recompute the trust score for a NearBuy customer. Reads all
 * `provider_to_client` reviews left for that user and writes the average +
 * count back to the User document.
 */
export async function recomputeUserTrustRating(
  userId: Types.ObjectId | string,
): Promise<void> {
  const userOid =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const [agg] = await AppointmentReview.aggregate<{
    _id: null;
    avg: number;
    count: number;
  }>([
    { $match: { toUserId: userOid, direction: "provider_to_client" } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.avg ?? 0;
  const count = agg?.count ?? 0;

  await User.updateOne(
    { _id: userOid },
    {
      $set: {
        trustRating: Math.round(avg * 100) / 100,
        trustReviewsCount: count,
      },
    },
  );
}

/**
 * Get-or-create the conversation tied to a (shop, customer) pair. Mirrors
 * the upsert flow in routes/conversations.ts so that creating an appointment
 * automatically opens the chat thread between the two parties.
 */
export async function ensureConversation(
  shopId: Types.ObjectId,
  customerUserId: Types.ObjectId,
): Promise<Types.ObjectId> {
  try {
    const conv = await Conversation.findOneAndUpdate(
      { shopId, customerUserId },
      {
        $setOnInsert: {
          shopId,
          customerUserId,
          lastMessageAt: new Date(),
          lastMessageText: "",
          lastMessageSenderRole: null,
          customerUnreadCount: 0,
          sellerUnreadCount: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return conv!._id;
  } catch (err: unknown) {
    // Race on the unique (shopId, customerUserId) index — re-read.
    const code = (err as { code?: number } | null)?.code;
    if (code === 11000) {
      const conv = await Conversation.findOne({
        shopId,
        customerUserId,
      })
        .select({ _id: 1 })
        .lean();
      if (conv) return conv._id;
    }
    throw err;
  }
}

/**
 * After an appointment lifecycle event, bump the conversation's preview line
 * so it surfaces at the top of both parties' chat lists with a clear hint.
 *
 * `actorRole` is the side that triggered the event — we increment the OTHER
 * side's unread counter, mirroring the message-send flow.
 */
export async function bumpConversationOnAppointmentEvent(
  conversationId: Types.ObjectId,
  actorRole: "customer" | "seller",
  previewText: string,
): Promise<void> {
  const otherUnreadField =
    actorRole === "customer" ? "sellerUnreadCount" : "customerUnreadCount";
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageAt: new Date(),
        lastMessageText: previewText,
        lastMessageSenderRole: actorRole,
      },
      $inc: { [otherUnreadField]: 1 },
    },
  );
}
