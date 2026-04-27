import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const ShopMemberSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["seller", "sub_seller"], required: true },
  },
  { timestamps: true },
);

ShopMemberSchema.index({ shopId: 1, userId: 1 }, { unique: true });

export type ShopMemberDoc = InferSchemaType<typeof ShopMemberSchema> & { _id: Types.ObjectId };

export const ShopMember: Model<ShopMemberDoc> =
  (models.ShopMember as Model<ShopMemberDoc>) ||
  model<ShopMemberDoc>("ShopMember", ShopMemberSchema);
