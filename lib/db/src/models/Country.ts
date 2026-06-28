import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  Types,
} from "mongoose";

const TranslationSchema = new Schema(
  {
    official: String,
    common: String,
  },
  { _id: false }
);

const CurrencySchema = new Schema(
  {
    name: String,
    symbol: String,
  },
  { _id: false }
);

const DemonymSchema = new Schema(
  {
    f: String,
    m: String,
  },
  { _id: false }
);

const CountrySchema = new Schema(
  {
    name: {
      common: {
        type: String,
        required: true,
        index: true,
      },
      official: String,

      nativeName: {
        type: Map,
        of: new Schema(
          {
            official: String,
            common: String,
          },
          { _id: false }
        ),
      },
    },

    tld: [String],

    cca2: {
      type: String,
      index: true,
      uppercase: true,
    },

    ccn3: String,

    cca3: {
      type: String,
      unique: true,
      uppercase: true,
      required: true,
    },

    cioc: String,

    independent: Boolean,

    status: String,

    unMember: Boolean,

    currencies: {
      type: Map,
      of: CurrencySchema,
    },

    idd: {
      root: String,
      suffixes: [String],
    },

    capital: [String],

    altSpellings: [String],

    region: {
      type: String,
      index: true,
    },

    subregion: String,

    languages: {
      type: Map,
      of: String,
    },

    translations: {
      type: Map,
      of: TranslationSchema,
    },

    latlng: [Number],

    landlocked: Boolean,

    borders: [String],

    area: Number,

    demonyms: {
      type: Map,
      of: DemonymSchema,
    },

    flag: String,

    maps: {
      googleMaps: String,
      openStreetMaps: String,
    },

    population: Number,

    gini: {
      type: Map,
      of: Number,
    },

    fifa: String,

    car: {
      signs: [String],
      side: {
        type: String,
        enum: ["left", "right"],
      },
    },

    timezones: [String],

    continents: [String],

    flags: {
      png: String,
      svg: String,
      alt: String,
    },

    coatOfArms: {
      png: String,
      svg: String,
    },

    startOfWeek: String,

    capitalInfo: {
      latlng: [Number],
    },

    postalCode: {
      format: String,
      regex: String,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export type CountryDoc = InferSchemaType<typeof CountrySchema> & {
  _id: Types.ObjectId;
};

export const Country: Model<CountryDoc> =
  (models.Country as Model<CountryDoc>) ||
  model<CountryDoc>("Country", CountrySchema);