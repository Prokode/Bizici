import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Product, Category, Shop } from "@workspace/db";
import { serializeProduct } from "../lib/serialize";
import { analyzeProductPhoto } from "../lib/openai";

function toObjectIds(ids: unknown): Types.ObjectId[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((s) => typeof s === "string" && Types.ObjectId.isValid(s))
    .map((s) => new Types.ObjectId(s as string));
}

export const productsController = {
  listForShop: async (req: Request, res: Response) => {
    const products = await Product.find({
      shop: new Types.ObjectId(String(req.params.shopId)),
      deletedAt: null,
    })
      .populate("categories")
      .sort({ createdAt: -1 })
      .lean();
    res.json(products.map(serializeProduct));
  },

  create: async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) {
      res.status(400).json({ error: "name required" });
      return;
    }

    // Accept categoryIds (new) OR a single legacy `category` string (resolves to slug match)
    let categoryIds = toObjectIds(body.categoryIds);
    if (
      categoryIds.length === 0 &&
      typeof body.category === "string" &&
      body.category.trim()
    ) {
      const slug = body.category
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const cat = await Category.findOne({ slug }).lean();
      if (cat) categoryIds = [cat._id];
    }

    const photos: string[] = Array.isArray(body.photos)
      ? body.photos.filter((p: unknown) => typeof p === "string")
      : typeof body.imageUrl === "string"
        ? [body.imageUrl]
        : [];

    const shopDoc = await Shop.findById(req.params.shopId)
      .select("sellerId")
      .lean();
    if (!shopDoc) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    const created = await Product.create({
      shop: new Types.ObjectId(String(req.params.shopId)),
      seller: shopDoc.sellerId,
      name: String(body.name),
      brand: body.brand ?? null,
      description: body.description ?? null,
      price: typeof body.price === "number" ? body.price : 0,
      quantity: typeof body.quantity === "number" ? body.quantity : 1,
      colors: Array.isArray(body.colors) ? body.colors : [],
      photos,
      sizes: Array.isArray(body.sizes) ? body.sizes : [],
      categories: categoryIds,
      weight: typeof body.weight === "number" ? body.weight : null,
      dimension: body.dimension ?? null,
      variations: Array.isArray(body.variations) ? body.variations : [],
      rating: typeof body.rating === "number" ? body.rating : null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      stockStatus:
        body.stockStatus === "out_of_stock" ? "out_of_stock" : "in_stock",
      applyDiscount: !!body.applyDiscount,
    });

    const populated = await Product.findById(created._id)
      .populate("categories")
      .lean();
    res.json(serializeProduct(populated));
  },

  update: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = req.body ?? {};
    const update: any = {};
    if (typeof body.name === "string") update.name = body.name;
    if (body.brand !== undefined) update.brand = body.brand;
    if (body.description !== undefined) update.description = body.description;
    if (typeof body.price === "number") update.price = body.price;
    if (typeof body.quantity === "number") {
      update.quantity = body.quantity;
      update.stockStatus = body.quantity > 0 ? "in_stock" : "out_of_stock";
    }
    if (Array.isArray(body.colors)) update.colors = body.colors;
    if (Array.isArray(body.photos)) update.photos = body.photos;
    if (typeof body.imageUrl === "string") update.photos = [body.imageUrl];
    if (Array.isArray(body.sizes)) update.sizes = body.sizes;
    if (Array.isArray(body.tags)) update.tags = body.tags;
    if (body.weight !== undefined) update.weight = body.weight;
    if (body.dimension !== undefined) update.dimension = body.dimension;
    if (Array.isArray(body.variations)) update.variations = body.variations;
    if (Array.isArray(body.categoryIds)) {
      update.categories = toObjectIds(body.categoryIds);
    }
    if (body.applyDiscount !== undefined)
      update.applyDiscount = !!body.applyDiscount;
    if (body.stockStatus === "in_stock" || body.stockStatus === "out_of_stock") {
      update.stockStatus = body.stockStatus;
    }
    update.lastVerifiedAt = new Date();

    const product = await Product.findOneAndUpdate(
      {
        _id: new Types.ObjectId(String(req.params.id)),
        shop: new Types.ObjectId(String(req.params.shopId)),
        deletedAt: null,
      },
      update,
      { new: true },
    )
      .populate("categories")
      .lean();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(serializeProduct(product));
  },

  remove: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const r = await Product.updateOne(
      {
        _id: new Types.ObjectId(String(req.params.id)),
        shop: new Types.ObjectId(String(req.params.shopId)),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } },
    );
    res.json({ success: r.modifiedCount > 0 });
  },

  analyzePhoto: async (req: Request, res: Response) => {
    const { imageBase64 } = req.body ?? {};
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 required" });
      return;
    }
    try {
      const out = await analyzeProductPhoto(imageBase64);
      res.json(out);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Analyze failed" });
    }
  },
};
