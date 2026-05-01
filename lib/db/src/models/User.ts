import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

/**
 * Origin of the consent acceptance — which signup pathway the user came
 * through when they ticked the legal checkbox. Useful for audit trail and
 * for reproducing the exact UI that was shown.
 */
export const CONSENT_SOURCES = [
  "email",
  "google",
  "apple",
  "unknown",
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

const ConsentSchema = new Schema(
  {
    /** Server-side timestamp when the user POSTed to /api/me/consent. */
    acceptedAt: { type: Date, required: true },
    /** Version of the legal corpus the user accepted (see LEGAL_VERSION). */
    version: { type: String, required: true },
    /** How the user signed up — email/password or third-party SSO. */
    source: {
      type: String,
      enum: CONSENT_SOURCES,
      required: true,
      default: "unknown",
    },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null, index: true },
    name: { type: String, default: null },
    // Trust score: average rating left by service providers after completed
    // appointments (provider → client direction). Lets a provider see how
    // reliable a customer was before accepting a new appointment.
    trustRating: { type: Number, default: 0, min: 0, max: 5 },
    trustReviewsCount: { type: Number, default: 0, min: 0 },
    /**
     * Audit trail proving the user accepted the legal documents at signup.
     * Optional because it is null for accounts that pre-existed this feature
     * (those should be re-prompted next time they upgrade the legal version).
     */
    consent: { type: ConsentSchema, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: any };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
