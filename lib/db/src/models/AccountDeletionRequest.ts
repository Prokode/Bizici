import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

export const ACCOUNT_DELETION_TYPES = ["customer", "seller", "both"] as const;
export type AccountDeletionType = (typeof ACCOUNT_DELETION_TYPES)[number];

export const ACCOUNT_DELETION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "rejected",
] as const;
export type AccountDeletionStatus = (typeof ACCOUNT_DELETION_STATUSES)[number];

const AccountDeletionRequestSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
      index: true,
    },
    accountType: {
      type: String,
      enum: ACCOUNT_DELETION_TYPES,
      required: true,
    },
    reason: { type: String, default: "", trim: true, maxlength: 2000 },
    confirmed: { type: Boolean, required: true },
    sourceIp: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 500 },
    status: {
      type: String,
      enum: ACCOUNT_DELETION_STATUSES,
      default: "pending",
      index: true,
    },
    handledByAdminId: { type: Schema.Types.ObjectId, default: null },
    handledAt: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: 4000 },
  },
  { timestamps: true },
);

AccountDeletionRequestSchema.index({ createdAt: -1 });
// Compound index for the admin queue view: filter by status, sort by date.
AccountDeletionRequestSchema.index({ status: 1, createdAt: -1 });

export type AccountDeletionRequestDoc = InferSchemaType<
  typeof AccountDeletionRequestSchema
> & { _id: Types.ObjectId };

export const AccountDeletionRequest: Model<AccountDeletionRequestDoc> =
  (models.AccountDeletionRequest as Model<AccountDeletionRequestDoc>) ||
  model<AccountDeletionRequestDoc>(
    "AccountDeletionRequest",
    AccountDeletionRequestSchema,
  );
