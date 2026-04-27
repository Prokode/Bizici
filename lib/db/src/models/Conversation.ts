import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

const ConversationSchema = new Schema(
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
    lastMessageAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    lastMessageText: { type: String, default: "" },
    lastMessageSenderRole: {
      type: String,
      enum: ["customer", "seller", null],
      default: null,
    },
    customerUnreadCount: { type: Number, default: 0, min: 0 },
    sellerUnreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ConversationSchema.index(
  { shopId: 1, customerUserId: 1 },
  { unique: true, name: "uniq_shop_customer" },
);
ConversationSchema.index({ customerUserId: 1, lastMessageAt: -1 });
ConversationSchema.index({ shopId: 1, lastMessageAt: -1 });

export type ConversationDoc = InferSchemaType<typeof ConversationSchema> & {
  _id: Types.ObjectId;
};

export const Conversation: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ||
  model<ConversationDoc>("Conversation", ConversationSchema);
