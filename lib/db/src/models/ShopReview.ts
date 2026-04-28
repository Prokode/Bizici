import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

const ShopReviewSchema = new Schema(
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
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true },
);

ShopReviewSchema.index(
  { shopId: 1, customerUserId: 1 },
  { unique: true },
);
ShopReviewSchema.index({ shopId: 1, createdAt: -1 });

export type ShopReviewDoc = InferSchemaType<typeof ShopReviewSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ShopReview: Model<ShopReviewDoc> =
  (models.ShopReview as Model<ShopReviewDoc>) ||
  model<ShopReviewDoc>("ShopReview", ShopReviewSchema);
