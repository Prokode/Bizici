import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { Discount, Product } from "@workspace/db";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { serializeDiscount } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/products/:productId/discounts",
  requireShopAccess,
  async (req, res) => {
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
);

router.post(
  "/shops/:shopId/products/:productId/discounts",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(400).json({ error: "Invalid productId" });
      return;
    }
    // Sanity: product must belong to this shop
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

    // Mark product as discounted
    await Product.updateOne(
      { _id: product._id },
      { $set: { applyDiscount: true } },
    );

    res.json(serializeDiscount(created.toObject()));
  },
);

router.delete(
  "/shops/:shopId/products/:productId/discounts/:discountId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
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
    // If no more active discounts, unflag product
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
);

export default router;
