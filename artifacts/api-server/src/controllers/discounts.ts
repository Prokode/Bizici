import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Discount, Product } from "@workspace/db";
import { serializeDiscount } from "../lib/serialize";

export const discountsController = {
  listForProduct: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(400).json({ error: "Invalid productId" });
      return;
    }
    const product = await Product.findOne({
      _id: new Types.ObjectId(req.params.productId),
      shop: new Types.ObjectId(req.params.shopId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!product) {
      res.status(404).json({ error: "Product not found in this shop" });
      return;
    }
    const items = await Discount.find({
      product: new Types.ObjectId(req.params.productId),
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items.map(serializeDiscount));
  },

  create: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(400).json({ error: "Invalid productId" });
      return;
    }
    const product = await Product.findOne({
      _id: new Types.ObjectId(req.params.productId),
      shop: new Types.ObjectId(req.params.shopId),
      deletedAt: null,
    }).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found in this shop" });
      return;
    }

    const body = req.body ?? {};
    const created = await Discount.create({
      product: new Types.ObjectId(req.params.productId),
      code: typeof body.code === "string" ? body.code : null,
      percentOff: typeof body.percentOff === "number" ? body.percentOff : 0,
      amountOff: typeof body.amountOff === "number" ? body.amountOff : 0,
      validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
      validTo: body.validTo ? new Date(body.validTo) : null,
      isActive: body.isActive !== false,
      createdBy: new Types.ObjectId(req.userId),
    });

    await Product.updateOne(
      { _id: product._id },
      { $set: { applyDiscount: true } },
    );

    res.json(serializeDiscount(created.toObject()));
  },

  remove: async (req: Request, res: Response) => {
    if (
      !Types.ObjectId.isValid(req.params.discountId) ||
      !Types.ObjectId.isValid(req.params.productId)
    ) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const product = await Product.findOne({
      _id: new Types.ObjectId(req.params.productId),
      shop: new Types.ObjectId(req.params.shopId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!product) {
      res.status(404).json({ error: "Product not found in this shop" });
      return;
    }
    const r = await Discount.deleteOne({
      _id: new Types.ObjectId(req.params.discountId),
      product: new Types.ObjectId(req.params.productId),
    });
    const remaining = await Discount.countDocuments({
      product: new Types.ObjectId(req.params.productId),
      isActive: true,
    });
    if (remaining === 0) {
      await Product.updateOne(
        { _id: new Types.ObjectId(req.params.productId) },
        { $set: { applyDiscount: false } },
      );
    }
    res.json({ success: r.deletedCount > 0 });
  },
};
