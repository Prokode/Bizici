import type { Request, Response } from "express";
import { City, Country } from "@workspace/db";

/** Lowercase + strip diacritics: the dedupe/search key for city names. */
function normalizeCityName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean display form: collapse whitespace, capitalize each word part. */
function displayCityName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
        )
        .join("-"),
    )
    .join(" ");
}

const NAME_RE = /^[\p{L}\p{M}'’. -]{2,64}$/u;

function serializeCity(c: { _id: unknown; name: string; countryCode: string }) {
  return {
    id: String(c._id),
    name: c.name,
    countryCode: c.countryCode,
  };
}

export const citiesController = {
  list: async (req: Request, res: Response) => {
    const country = String(req.query.country ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      res.status(400).json({ error: "Invalid country code" });
      return;
    }
    const q = normalizeCityName(String(req.query.q ?? ""));
    const filter: Record<string, unknown> = { countryCode: country };
    if (q) {
      filter.nameNormalized = {
        $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      };
    }
    const cities = await City.find(filter)
      .sort({ nameNormalized: 1 })
      .limit(20)
      .lean();
    res.json(cities.map(serializeCity));
  },

  resolve: async (req: Request, res: Response) => {
    const countryCode = String(req.body?.country ?? "").toUpperCase();
    const rawName = String(req.body?.name ?? "");
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      res.status(400).json({ error: "Invalid country code" });
      return;
    }
    if (!NAME_RE.test(rawName.trim())) {
      res.status(400).json({ error: "Invalid city name" });
      return;
    }
    const countryDoc = await Country.findOne({ cca2: countryCode })
      .select("_id")
      .lean();
    if (!countryDoc) {
      res.status(400).json({ error: "Unknown country" });
      return;
    }

    const nameNormalized = normalizeCityName(rawName);
    const name = displayCityName(rawName);

    // Idempotent find-or-create keyed on (countryCode, nameNormalized): a
    // repeat resolve of "PARIS" / "paris" / "Pàris" returns the same doc.
    let city;
    try {
      city = await City.findOneAndUpdate(
        { countryCode, nameNormalized },
        {
          $setOnInsert: {
            name,
            nameNormalized,
            countryCode,
            country: countryDoc._id,
          },
        },
        { new: true, upsert: true },
      ).lean();
    } catch (err: unknown) {
      // Concurrent upserts on the unique (countryCode, nameNormalized) index
      // can race and throw E11000; the doc exists now, so read it back.
      if ((err as { code?: number })?.code === 11000) {
        city = await City.findOne({ countryCode, nameNormalized }).lean();
      } else {
        throw err;
      }
    }

    res.json(serializeCity(city!));
  },
};
