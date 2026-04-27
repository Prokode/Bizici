import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

/**
 * KarmaEvent — append-only ledger of points awarded to a NearBuy customer.
 * The user's total Karma is `sum(points)` for their userId.
 *
 * Each event records *why* the points were awarded so we can display a small
 * recent-activity list in the Profile tab and audit issues later.
 */
const KarmaEventSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["welcome", "stock_confirmation", "stock_report", "broadcast"],
      required: true,
    },
    points: { type: Number, required: true },
    note: { type: String, default: null },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
  },
  { timestamps: true },
);

KarmaEventSchema.index({ userId: 1, createdAt: -1 });

export type KarmaEventDoc = InferSchemaType<typeof KarmaEventSchema> & {
  _id: Types.ObjectId;
};

export const KarmaEvent: Model<KarmaEventDoc> =
  (models.KarmaEvent as Model<KarmaEventDoc>) ||
  model<KarmaEventDoc>("KarmaEvent", KarmaEventSchema);
