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
    // Denormalized aggregates kept in sync by the reviews endpoints. Storing
    // them here lets list/map/search queries return ratings without an extra
    // aggregation pass on every shop card.
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ShopSchema.index({ location: "2dsphere" });

export type ShopDoc = InferSchemaType<typeof ShopSchema> & { _id: Types.ObjectId };

export const Shop: Model<ShopDoc> =
  (models.Shop as Model<ShopDoc>) || model<ShopDoc>("Shop", ShopSchema);
