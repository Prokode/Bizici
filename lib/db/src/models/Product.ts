import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

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

const DimensionSchema = new Schema(
  {
    height: { type: Number, min: 0, required: true },
    length: { type: Number, min: 0, required: true },
    width: { type: Number, min: 0, required: true },
  },
  { _id: false },
);

const VariationSchema = new Schema(
  {
    sku: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    colors: [{ type: String }],
    photos: [{ type: String }],
    dimension: { type: DimensionSchema, default: null },
  },
  { _id: true, timestamps: false },
);

const ProductSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    name: { type: String, required: true },
    slug: { type: String, default: null, index: true },
    brand: { type: String, default: null },
    description: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 0 },

    colors: [{ type: String }],
    photos: [{ type: String }],
    sizes: [{ type: String }],
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    weight: { type: Number, min: 0, default: null },
    dimension: { type: DimensionSchema, default: null },
    variations: { type: [VariationSchema], default: [] },

    rating: { type: Number, min: 0, max: 10, default: null },
    reviews: { type: Number, min: 0, default: 0 },
    totalSell: { type: Number, min: 0, default: 0 },
    applyDiscount: { type: Boolean, default: false },

    tags: [{ type: String }],
    stockStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock",
    },
    lastVerifiedAt: { type: Date, default: () => new Date() },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

ProductSchema.pre("save", function (this: any, next: (err?: unknown) => void) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name as string);
  }
  if (this.isModified("quantity")) {
    this.stockStatus = (this.quantity ?? 0) > 0 ? "in_stock" : "out_of_stock";
  }
  next();
});

ProductSchema.virtual("discounts", {
  ref: "Discount",
  localField: "_id",
  foreignField: "product",
  justOne: false,
});

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: Types.ObjectId;
};

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
