import type { Request, Response } from "express";
import { Types } from "mongoose";
import crypto from "node:crypto";
import {
  Shop,
  ShopMember,
  BroadcastRequest,
  Product,
  Conversation,
  Message,
  ShopReview,
} from "@workspace/db";
import { serializeShop } from "../lib/serialize";

export const shopsController = {
  listMine: async (req: Request, res: Response) => {
    const memberships = await ShopMember.find({
      userId: new Types.ObjectId(req.userId),
    }).lean();
    const shopIds = memberships.map((m) => m.shopId);
    const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
    const shopMap = new Map(shops.map((s) => [String(s._id), s]));
    res.json(
      memberships
        .map((m) => {
          const shop = shopMap.get(String(m.shopId));
          if (!shop) return null;
          return { shop: serializeShop(shop), role: m.role };
        })
        .filter((x) => x !== null),
    );
  },

  create: async (req: Request, res: Response) => {
    const {
      name,
      marketName,
      stallInfo,
      latitude,
      longitude,
      kind,
      fulfillment,
      deliveryRadiusKm,
    } = req.body ?? {};
    if (
      !name ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      res.status(400).json({ error: "name, latitude, longitude required" });
      return;
    }

    const allowedKinds = ["products", "services", "hybrid"] as const;
    const shopKind = allowedKinds.includes(kind as (typeof allowedKinds)[number])
      ? (kind as (typeof allowedKinds)[number])
      : "products";
    const allowedFulfillments = [
      "pickup_only",
      "delivery_only",
      "both",
    ] as const;
    const shopFulfillment = allowedFulfillments.includes(
      fulfillment as (typeof allowedFulfillments)[number],
    )
      ? (fulfillment as (typeof allowedFulfillments)[number])
      : "pickup_only";

    const shop = await Shop.create({
      sellerId: new Types.ObjectId(req.userId),
      name,
      marketName: marketName ?? null,
      stallInfo: stallInfo ?? null,
      location: { type: "Point", coordinates: [longitude, latitude] },
      isOpen: true,
      kind: shopKind,
      fulfillment: shopFulfillment,
      deliveryRadiusKm:
        typeof deliveryRadiusKm === "number"
          ? Math.min(Math.max(deliveryRadiusKm, 1), 100)
          : null,
    });

    await ShopMember.create({
      shopId: shop._id,
      userId: new Types.ObjectId(req.userId),
      role: "seller",
    });

    // Seed 4 demo broadcast requests within 200-2000m if this is the user's first shop
    const totalShops = await ShopMember.countDocuments({
      userId: new Types.ObjectId(req.userId),
    });
    if (totalShops === 1) {
      const demos = [
        "Tomates fraîches",
        "Pain",
        "Eau minérale",
        "Ampoules LED",
      ].map((q) => {
        const r = 200 + Math.random() * 1800; // meters
        const theta = Math.random() * 2 * Math.PI;
        const dx = (r * Math.cos(theta)) / 111_320;
        const dy = (r * Math.sin(theta)) / 110_540;
        return {
          userId: null,
          query: q,
          status: "active" as const,
          location: {
            type: "Point" as const,
            coordinates: [longitude + dx, latitude + dy],
          },
        };
      });
      await BroadcastRequest.insertMany(demos);
    }

    res.json(serializeShop(shop.toObject()));
  },

  getOne: async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.shopId).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(serializeShop(shop));
  },

  update: async (req: Request, res: Response) => {
    const {
      name,
      marketName,
      stallInfo,
      latitude,
      longitude,
      kind,
      fulfillment,
      deliveryRadiusKm,
    } = req.body ?? {};
    const update: any = {};
    if (typeof name === "string") update.name = name;
    if (marketName !== undefined) update.marketName = marketName;
    if (stallInfo !== undefined) update.stallInfo = stallInfo;
    if (typeof latitude === "number" && typeof longitude === "number") {
      update.location = { type: "Point", coordinates: [longitude, latitude] };
    }
    if (kind === "products" || kind === "services" || kind === "hybrid") {
      update.kind = kind;
    }
    if (
      fulfillment === "pickup_only" ||
      fulfillment === "delivery_only" ||
      fulfillment === "both"
    ) {
      update.fulfillment = fulfillment;
    }
    if (deliveryRadiusKm === null) {
      update.deliveryRadiusKm = null;
    } else if (typeof deliveryRadiusKm === "number") {
      update.deliveryRadiusKm = Math.min(Math.max(deliveryRadiusKm, 1), 100);
    }
    const shop = await Shop.findByIdAndUpdate(req.params.shopId, update, {
      new: true,
    }).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(serializeShop(shop, { viewerIsOwner: true }));
  },

  setOpen: async (req: Request, res: Response) => {
    const isOpen = !!req.body?.isOpen;
    const shop = await Shop.findByIdAndUpdate(
      req.params.shopId,
      { isOpen },
      { new: true },
    ).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(serializeShop(shop));
  },

  getQr: async (req: Request, res: Response) => {
    const token = crypto
      .createHash("sha256")
      .update(`${req.params.shopId}:${process.env.SESSION_SECRET ?? ""}`)
      .digest("hex")
      .slice(0, 16);
    const url = `nearbuy://shop/${req.params.shopId}?t=${token}`;
    res.json({ url, token });
  },

  dashboard: async (req: Request, res: Response) => {
    const shopObjectId = new Types.ObjectId(req.params.shopId as string);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      inStockCount,
      outOfStockCount,
      shop,
      convAgg,
      reviewAgg,
      convIds,
    ] = await Promise.all([
      Product.countDocuments({ shop: shopObjectId, deletedAt: null }),
      Product.countDocuments({
        shop: shopObjectId,
        deletedAt: null,
        stockStatus: "in_stock",
      }),
      Product.countDocuments({
        shop: shopObjectId,
        deletedAt: null,
        stockStatus: "out_of_stock",
      }),
      Shop.findById(shopObjectId).lean(),
      Conversation.aggregate<{
        _id: null;
        count: number;
        unread: number;
        lastMessageAt: Date | null;
      }>([
        { $match: { shopId: shopObjectId } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            unread: { $sum: "$sellerUnreadCount" },
            lastMessageAt: { $max: "$lastMessageAt" },
          },
        },
      ]),
      ShopReview.aggregate<{ _id: null; count: number; avg: number }>([
        { $match: { shopId: shopObjectId } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avg: { $avg: "$rating" },
          },
        },
      ]),
      Conversation.find({ shopId: shopObjectId }, { _id: 1 }).lean(),
    ]);

    let activeRequestsCount = 0;
    if (shop) {
      activeRequestsCount = await BroadcastRequest.countDocuments({
        status: "active",
        location: {
          $nearSphere: {
            $geometry: shop.location as any,
            $maxDistance: 5000,
          },
        },
      });
    }

    const messages7d =
      convIds.length > 0
        ? await Message.countDocuments({
            conversationId: { $in: convIds.map((c) => c._id) },
            senderRole: "customer",
            createdAt: { $gte: sevenDaysAgo },
          })
        : 0;

    const conv = convAgg[0] ?? { count: 0, unread: 0, lastMessageAt: null };
    const review = reviewAgg[0] ?? { count: 0, avg: null };

    res.json({
      totalProducts,
      inStockCount,
      outOfStockCount,
      activeRequestsCount,
      reviewCount: review.count,
      ratingAvg:
        review.avg !== null && review.avg !== undefined
          ? Math.round(review.avg * 10) / 10
          : null,
      conversationCount: conv.count,
      unreadCount: conv.unread,
      messages7d,
      lastMessageAt: conv.lastMessageAt
        ? new Date(conv.lastMessageAt).toISOString()
        : null,
    });
  },

  summary: async (req: Request, res: Response) => {
    const shopObjectId = new Types.ObjectId(req.params.shopId as string);
    const [totalProducts, inStockCount, outOfStockCount, shop] =
      await Promise.all([
        Product.countDocuments({ shop: shopObjectId, deletedAt: null }),
        Product.countDocuments({
          shop: shopObjectId,
          deletedAt: null,
          stockStatus: "in_stock",
        }),
        Product.countDocuments({
          shop: shopObjectId,
          deletedAt: null,
          stockStatus: "out_of_stock",
        }),
        Shop.findById(req.params.shopId).lean(),
      ]);

    let activeRequestsCount = 0;
    if (shop) {
      activeRequestsCount = await BroadcastRequest.countDocuments({
        status: "active",
        location: {
          $nearSphere: {
            $geometry: shop.location as any,
            $maxDistance: 5000,
          },
        },
      });
    }

    res.json({
      totalProducts,
      inStockCount,
      outOfStockCount,
      activeRequestsCount,
    });
  },
};
