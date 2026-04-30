import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

export const APPOINTMENT_STATUSES = [
  "proposed",
  "confirmed",
  "declined",
  "completed",
  "cancelled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_ACTOR_ROLES = ["customer", "seller"] as const;
export type AppointmentActorRole = (typeof APPOINTMENT_ACTOR_ROLES)[number];

/**
 * An Appointment is a single rendez-vous between a customer and a service
 * provider (shop). The customer is always the initiator (project rule).
 *
 * Lifecycle:
 *   proposed  -> confirmed | declined | cancelled
 *   confirmed -> completed | cancelled
 *   completed | declined | cancelled are terminal
 *
 * Reviews are submitted post-completion via the AppointmentReview collection.
 *
 * The conversationId links the appointment to the chat between the same two
 * parties so the chat UI can render an inline appointment card alongside
 * regular messages.
 */
const AppointmentSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The shop's owner (sellerId on Shop). Cached for fast lookups when
    // computing the user's trust rating without re-resolving Shop on read.
    sellerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null, min: 1, max: 24 * 60 },
    notes: { type: String, default: null, maxlength: 1000 },

    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "proposed",
      required: true,
      index: true,
    },

    // Lifecycle timestamps — kept alongside `status` so we can render an
    // accurate timeline in the chat without an event-sourcing table.
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: null, maxlength: 500 },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: String,
      enum: APPOINTMENT_ACTOR_ROLES,
      default: null,
    },
    cancelReason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

// Common queries: list a user's appointments by recency.
AppointmentSchema.index({ customerUserId: 1, scheduledAt: -1 });
AppointmentSchema.index({ sellerUserId: 1, scheduledAt: -1 });
AppointmentSchema.index({ shopId: 1, scheduledAt: -1 });
AppointmentSchema.index({ conversationId: 1, createdAt: -1 });

export type AppointmentDoc = InferSchemaType<typeof AppointmentSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Appointment: Model<AppointmentDoc> =
  (models.Appointment as Model<AppointmentDoc>) ||
  model<AppointmentDoc>("Appointment", AppointmentSchema);
