import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "seller"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & {
  _id: Types.ObjectId;
};

export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) ||
  model<MessageDoc>("Message", MessageSchema);
