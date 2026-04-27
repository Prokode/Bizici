import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    icon: { type: String, default: null },
  },
  { timestamps: true },
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & {
  _id: Types.ObjectId;
};

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) || model<CategoryDoc>("Category", CategorySchema);
