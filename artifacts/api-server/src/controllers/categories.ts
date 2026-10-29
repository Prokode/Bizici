import type { Request, Response } from "express";
import { Category, Shop } from "@workspace/db";
import { createHash } from "node:crypto";
import { serializeCategory } from "../lib/serialize";

export const categoriesController = {
  createService: async (req: Request, res: Response) => {
    const name = typeof req.body?.name === "string"
      ? req.body.name.normalize("NFC").trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: "Category name must contain between 2 and 80 characters" });
      return;
    }
    const shop = await Shop.findById(req.params.shopId as string).select("kind").lean();
    if (!shop || shop.kind === "products") {
      res.status(403).json({ error: "Service categories require a service or hybrid shop" });
      return;
    }
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await Category.findOne({
      kind: "service", name: { $regex: `^${escaped}$`, $options: "i" },
    }).lean();
    if (existing) {
      res.json(serializeCategory(existing));
      return;
    }
    const canonical = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const slug = `service-custom-${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
    let category;
    try {
      category = await Category.findOneAndUpdate(
        { slug }, { $setOnInsert: { name, slug, kind: "service" } },
        { upsert: true, new: true, runValidators: true },
      ).lean();
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      category = await Category.findOne({ slug }).lean();
      if (!category) throw error;
    }
    res.json(serializeCategory(category));
  },
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
