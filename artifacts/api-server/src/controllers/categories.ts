import type { Request, Response } from "express";
import { Category } from "@workspace/db";
import { serializeCategory } from "../lib/serialize";

export const categoriesController = {
  list: async (req: Request, res: Response) => {
    const rawKind = typeof req.query.kind === "string" ? req.query.kind : null;
    const filter: Record<string, unknown> = {};
    if (rawKind === "product" || rawKind === "service") {
      filter.kind = rawKind;
    }
    const cats = await Category.find(filter).sort({ name: 1 }).lean();
    res.json(cats.map(serializeCategory));
  },
};
