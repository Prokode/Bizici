import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const BroadcastRequestSchema = new Schema(
  {
    userId: { type: String, default: null, index: true },
    query: { type: String, required: true },
    location: { type: PointSchema, required: true },
    status: {
      type: String,
      enum: ["active", "found", "expired"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

BroadcastRequestSchema.index({ location: "2dsphere" });

export type BroadcastRequestDoc = InferSchemaType<typeof BroadcastRequestSchema> & {
  _id: Types.ObjectId;
};

export const BroadcastRequest: Model<BroadcastRequestDoc> =
  (models.BroadcastRequest as Model<BroadcastRequestDoc>) ||
  model<BroadcastRequestDoc>("BroadcastRequest", BroadcastRequestSchema);
