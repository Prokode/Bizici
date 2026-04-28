import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

export const ADMIN_ROLES = ["super_admin", "admin", "moderator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const AdminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 64,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ADMIN_ROLES,
      required: true,
      default: "admin",
    },
    isRoot: { type: Boolean, default: false },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type AdminDoc = InferSchemaType<typeof AdminSchema> & {
  _id: Types.ObjectId;
};

export const Admin: Model<AdminDoc> =
  (models.Admin as Model<AdminDoc>) ||
  model<AdminDoc>("Admin", AdminSchema);
