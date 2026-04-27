import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const DiscountSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    code: { type: String, default: null },
    percentOff: { type: Number, min: 0, max: 100, default: 0 },
    amountOff: { type: Number, min: 0, default: 0 },
    validFrom: { type: Date, default: () => new Date() },
    validTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type DiscountDoc = InferSchemaType<typeof DiscountSchema> & {
  _id: Types.ObjectId;
};

export const Discount: Model<DiscountDoc> =
  (models.Discount as Model<DiscountDoc>) || model<DiscountDoc>("Discount", DiscountSchema);
