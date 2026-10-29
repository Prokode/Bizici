import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CatalogLikeSchema = new Schema({
  shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  kind: { type: String, enum: ["product", "service"], required: true },
  item: { type: Schema.Types.ObjectId, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

// One durable vote per account and item, even across devices/concurrent requests.
CatalogLikeSchema.index({ kind: 1, item: 1, user: 1 }, { unique: true });
export type CatalogLikeDoc = InferSchemaType<typeof CatalogLikeSchema>;
export const CatalogLike = (models.CatalogLike as Model<CatalogLikeDoc> | undefined)
  ?? model<CatalogLikeDoc>("CatalogLike", CatalogLikeSchema);
