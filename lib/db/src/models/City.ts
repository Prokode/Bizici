import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";
 
const CitySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: false, unique: true, index: true },
    country: {
            type: Schema.ObjectId,
            ref: 'Country',
            required: [true, 'country field required']
    },
  },
  { timestamps: true },
);

export type CityDoc = InferSchemaType<typeof CitySchema> & {
  _id: Types.ObjectId;
};

export const City: Model<CityDoc> =
  (models.City as Model<CityDoc>) || model<CityDoc>("City", CitySchema);
