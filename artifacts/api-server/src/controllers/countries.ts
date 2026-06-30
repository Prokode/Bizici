import type { Request, Response } from "express";
import { Country } from "@workspace/db";

/**
 * Build the international dialing prefix from the restcountries `idd` shape.
 * - Single suffix → root + suffix (e.g. France: "+3" + "3" = "+33").
 * - Many suffixes (e.g. US/Canada area codes) → just the root ("+1").
 * - Missing idd (e.g. Antarctica) → "".
 */
function callingCodeFrom(idd?: {
  root?: string | null;
  suffixes?: string[] | null;
}): string {
  const root = idd?.root ?? "";
  if (!root) return "";
  const suffixes = idd?.suffixes ?? [];
  if (suffixes.length === 1) return `${root}${suffixes[0]}`;
  return root;
}

function serializeCountry(c: any) {
  const cca2 = String(c.cca2 ?? "").toUpperCase();
  const nameFr = c.translations?.fra?.common ?? c.name?.common ?? "";
  return {
    cca2,
    cca3: String(c.cca3 ?? "").toUpperCase(),
    name: c.name?.common ?? "",
    nameFr,
    callingCode: callingCodeFrom(c.idd),
    flagPng: cca2
      ? `https://flagcdn.com/w80/${cca2.toLowerCase()}.png`
      : "",
    flagEmoji: c.flag ?? "",
  };
}

export const countriesController = {
  list: async (_req: Request, res: Response) => {
    const countries = await Country.find({}).sort({ "name.common": 1 }).lean();
    res.json(countries.map(serializeCountry));
  },
};
