import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

export const SHOP_KINDS = ["products", "services", "hybrid"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

// Where a service is performed. Set on the provider profile (default for the
// whole shop) and may be overridden per-Service.
export const SERVICE_LOCATIONS = ["at_shop", "at_customer", "both"] as const;
export type ServiceLocation = (typeof SERVICE_LOCATIONS)[number];

// How a product shop fulfils orders. "pickup_only" = customer must come,
// "delivery_only" = shop only delivers, "both" = either.
export const SHOP_FULFILLMENTS = [
  "pickup_only",
  "delivery_only",
  "both",
] as const;
export type ShopFulfillment = (typeof SHOP_FULFILLMENTS)[number];

const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

// Embedded provider profile. Populated only when shop offers services
// (kind === "services" or "hybrid"). All fields are nullable so a shop can
// register first and complete the profile later.
const ServiceProviderSchema = new Schema(
  {
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    age: { type: Number, default: null, min: 16, max: 120 },
    hideAge: { type: Boolean, default: false },
    bio: { type: String, default: null },
    photoUrl: { type: String, default: null },
    yearsExperience: { type: Number, default: null, min: 0, max: 80 },
    certifications: { type: [String], default: [] },
    serviceRadiusKm: { type: Number, default: 10, min: 1, max: 100 },
    portfolioPhotos: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    // Default execution location for the provider's services. May be
    // overridden by an individual Service. Defaults to "at_shop" so
    // existing providers behave as before (client comes to the shop).
    serviceLocation: {
      type: String,
      enum: SERVICE_LOCATIONS,
      default: "at_shop",
      required: true,
    },
    // Aggregates fed by AppointmentReview (client → provider direction only).
    // Denormalized so list/map/search responses can sort by reputation
    // without an extra aggregation pass.
    appointmentRating: { type: Number, default: 0, min: 0, max: 5 },
    appointmentReviewsCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false, timestamps: false },
);

// Lifecycle status of the shop's KYC submission. Mirrored on KycDocument
// so map/search queries can filter without joining the document collection.
export const KYC_STATUSES = ["unsubmitted", "pending", "approved", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

// Embedded KYC summary on the shop. The actual ID images live in the separate
// KycDocument collection to keep shop list queries lean.
const ShopKycSchema = new Schema(
  {
    status: {
      type: String,
      enum: KYC_STATUSES,
      default: "unsubmitted",
      required: true,
      index: true,
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    rejectionReason: { type: String, default: null },
  },
  { _id: false, timestamps: false },
);

const ShopSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    marketName: { type: String, default: null },
    stallInfo: { type: String, default: null },
    location: { type: PointSchema, required: true },
    isOpen: { type: Boolean, default: true },
    // Whether this shop sells products, offers services, or both. Defaults to
    // "products" so existing shops keep their previous behavior on first read.
    kind: {
      type: String,
      enum: SHOP_KINDS,
      default: "products",
      required: true,
      index: true,
    },
    serviceProvider: { type: ServiceProviderSchema, default: () => ({}) },
    // KYC validation summary. Shops are only visible in customer-facing
    // search/map endpoints when kyc.status === "approved".
    kyc: { type: ShopKycSchema, default: () => ({}) },
    // For product shops (and the product side of a hybrid shop): how does
    // the merchant fulfil orders. Defaults to "pickup_only" so existing
    // shops keep behaving as before.
    fulfillment: {
      type: String,
      enum: SHOP_FULFILLMENTS,
      default: "pickup_only",
      required: true,
      index: true,
    },
    // Optional delivery radius in km. Only meaningful when fulfillment is
    // "delivery_only" or "both". null = no advertised limit.
    deliveryRadiusKm: { type: Number, default: null, min: 1, max: 100 },
    // Denormalized aggregates kept in sync by the reviews endpoints. Storing
    // them here lets list/map/search queries return ratings without an extra
    // aggregation pass on every shop card.
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ShopSchema.index({ location: "2dsphere" });

export type ShopDoc = InferSchemaType<typeof ShopSchema> & { _id: Types.ObjectId };

export const Shop: Model<ShopDoc> =
  (models.Shop as Model<ShopDoc>) || model<ShopDoc>("Shop", ShopSchema);
