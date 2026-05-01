import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

// Type of identity document submitted by the seller / service provider.
export const KYC_DOCUMENT_TYPES = ["id_card", "passport", "driver_license"] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

// Lifecycle status of a KYC submission. Mirrors the enum stored on
// Shop.kyc.status so list endpoints can filter without joining this collection.
export const KYC_STATUSES = ["unsubmitted", "pending", "approved", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

// Stored separately from Shop because the base64 image payload would otherwise
// bloat every shop list query. One active document per shop (we upsert on
// re-submission after rejection).
const KycDocumentSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: KYC_DOCUMENT_TYPES,
      required: true,
    },
    // Base64 data URL or raw base64 of the front of the document (required).
    frontImageBase64: { type: String, required: true },
    // Optional back image (CNI / driver's license).
    backImageBase64: { type: String, default: null },
    submittedAt: { type: Date, required: true, default: () => new Date() },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    status: {
      type: String,
      enum: KYC_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true },
);

export type KycDocumentDoc = InferSchemaType<typeof KycDocumentSchema> & {
  _id: Types.ObjectId;
};

export const KycDocument: Model<KycDocumentDoc> =
  (models.KycDocument as Model<KycDocumentDoc>) ||
  model<KycDocumentDoc>("KycDocument", KycDocumentSchema);
