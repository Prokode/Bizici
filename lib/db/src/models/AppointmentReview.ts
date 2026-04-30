import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

export const APPOINTMENT_REVIEW_DIRECTIONS = [
  "client_to_provider",
  "provider_to_client",
] as const;
export type AppointmentReviewDirection =
  (typeof APPOINTMENT_REVIEW_DIRECTIONS)[number];

/**
 * A bilateral review left after an Appointment is completed.
 *
 * Each direction can be submitted at most once (enforced by the unique
 * compound index below). The author is allowed to update the rating and
 * comment by re-POSTing within a 30-day grace window — the route layer is
 * responsible for that policy; at the storage level we just upsert.
 *
 * `direction` is denormalized (could be derived from comparing fromUserId
 * to the appointment's customer/seller) but storing it explicitly makes
 * aggregate pipelines and the unique index much cheaper.
 */
const AppointmentReviewSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Cached on the review so trust/provider aggregates can be recomputed
    // without rejoining Appointment.
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: APPOINTMENT_REVIEW_DIRECTIONS,
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true },
);

AppointmentReviewSchema.index(
  { appointmentId: 1, direction: 1 },
  { unique: true, name: "uniq_appt_direction" },
);

export type AppointmentReviewDoc = InferSchemaType<
  typeof AppointmentReviewSchema
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AppointmentReview: Model<AppointmentReviewDoc> =
  (models.AppointmentReview as Model<AppointmentReviewDoc>) ||
  model<AppointmentReviewDoc>("AppointmentReview", AppointmentReviewSchema);
