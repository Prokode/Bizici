import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

const ShopSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    marketName: { type: String, default: null },
    stallInfo: { type: String, default: null },
    location: { type: PointSchema, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ShopSchema.index({ location: "2dsphere" });

export type ShopDoc = InferSchemaType<typeof ShopSchema> & { _id: Types.ObjectId };

export const Shop: Model<ShopDoc> =
  (models.Shop as Model<ShopDoc>) || model<ShopDoc>("Shop", ShopSchema);
