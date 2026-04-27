import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const ShopInvitationSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["seller", "sub_seller"], default: "sub_seller" },
    token: { type: String, required: true, unique: true, index: true },
    clerkInvitationId: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type ShopInvitationDoc = InferSchemaType<typeof ShopInvitationSchema> & {
  _id: Types.ObjectId;
};

export const ShopInvitation: Model<ShopInvitationDoc> =
  (models.ShopInvitation as Model<ShopInvitationDoc>) ||
  model<ShopInvitationDoc>("ShopInvitation", ShopInvitationSchema);
