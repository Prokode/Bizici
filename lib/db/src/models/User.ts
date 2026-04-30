import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

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
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: any };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
