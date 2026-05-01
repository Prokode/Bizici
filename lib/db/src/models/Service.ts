import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

export const PRICING_TYPES = ["fixed", "hourly", "quote"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

// Per-service override of the provider's default execution location.
// "inherit" (default) means: use the parent shop's
// `serviceProvider.serviceLocation`. The other three values mirror the
// shop-level enum.
export const SERVICE_LOCATION_OVERRIDES = [
  "inherit",
  "at_shop",
  "at_customer",
  "both",
] as const;
export type ServiceLocationOverride =
  (typeof SERVICE_LOCATION_OVERRIDES)[number];

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const ServiceSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true },
    slug: { type: String, default: null, index: true },
    description: { type: String, default: null },

    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    pricingType: {
      type: String,
      enum: PRICING_TYPES,
      required: true,
      default: "quote",
    },
    // For "fixed" → flat price. For "hourly" → per-hour rate. For "quote" → may be null
    // (shows "À partir de" if provided, "Sur devis" otherwise).
    price: { type: Number, default: null, min: 0 },
    // Optional indicative duration in minutes, mainly for fixed-price services
    // (e.g. "Coupe homme — 30 min, 25 €"). Hourly services typically leave it null.
    durationMinutes: { type: Number, default: null, min: 1 },

    photos: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    // Where the service is executed. "inherit" (default) means use the
    // parent shop's serviceProvider.serviceLocation. Use one of the other
    // enum values to override per-service (e.g. a salon offers "Coupe en
    // boutique" + "Coupe à domicile" as two distinct services).
    serviceLocation: {
      type: String,
      enum: SERVICE_LOCATION_OVERRIDES,
      default: "inherit",
      required: true,
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

ServiceSchema.pre("save", function (this: any, next: (err?: unknown) => void) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title as string);
  }
  next();
});

export type ServiceDoc = InferSchemaType<typeof ServiceSchema> & {
  _id: Types.ObjectId;
};

export const Service: Model<ServiceDoc> =
  (models.Service as Model<ServiceDoc>) || model<ServiceDoc>("Service", ServiceSchema);
