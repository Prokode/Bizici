import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

/**
 * User-populated, normalized city registry. Cities are created on demand via
 * the resolve endpoint (never stored as raw free text): `name` is the clean
 * display form, `nameNormalized` (lowercase, diacritics stripped) is the
 * dedupe/search key. Uniqueness is scoped per country — two countries can
 * both have a "Paris".
 */
const CitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      index: true,
    },
    country: {
      type: Schema.ObjectId,
      ref: "Country",
      required: [true, "country field required"],
    },
  },
  { timestamps: true },
);

CitySchema.index({ countryCode: 1, nameNormalized: 1 }, { unique: true });

export type CityDoc = InferSchemaType<typeof CitySchema> & {
  _id: Types.ObjectId;
};

export const City: Model<CityDoc> =
  (models.City as Model<CityDoc>) || model<CityDoc>("City", CitySchema);
