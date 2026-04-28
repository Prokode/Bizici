import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

export const PUSH_PLATFORMS = ["ios", "android", "web"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

const PushTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expoPushToken: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: PUSH_PLATFORMS,
      required: true,
    },
    lastSeenAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true },
);

PushTokenSchema.index({ expoPushToken: 1 }, { unique: true });

export type PushTokenDoc = InferSchemaType<typeof PushTokenSchema> & {
  _id: Types.ObjectId;
};

export const PushToken: Model<PushTokenDoc> =
  (models.PushToken as Model<PushTokenDoc>) ||
  model<PushTokenDoc>("PushToken", PushTokenSchema);
