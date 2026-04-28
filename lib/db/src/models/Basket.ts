import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

const BasketItemSchema = new Schema(
  {
    query: { type: String, required: true, trim: true, maxlength: 120 },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const BasketSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [BasketItemSchema], default: [] },
  },
  { timestamps: true },
);

export type BasketItemDoc = InferSchemaType<typeof BasketItemSchema> & {
  _id: Types.ObjectId;
};

export type BasketDoc = InferSchemaType<typeof BasketSchema> & {
  _id: Types.ObjectId;
  items: Types.DocumentArray<BasketItemDoc>;
};

export const Basket: Model<BasketDoc> =
  (models.Basket as Model<BasketDoc>) ||
  model<BasketDoc>("Basket", BasketSchema);
