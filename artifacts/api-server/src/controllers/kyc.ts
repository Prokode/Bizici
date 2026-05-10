import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Shop, KycDocument, KYC_DOCUMENT_TYPES, User } from "@workspace/db";

export const kycController = {
  // ===== Seller-facing =====================================================
  getStatus: async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.shopId).select("kyc").lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    const k = shop.kyc ?? { status: "unsubmitted" };
    res.json({
      status: (k.status ?? "unsubmitted") as
        | "unsubmitted"
        | "pending"
        | "approved"
        | "rejected",
      submittedAt: k.submittedAt
        ? new Date(k.submittedAt).toISOString()
        : null,
      reviewedAt: k.reviewedAt ? new Date(k.reviewedAt).toISOString() : null,
      rejectionReason: k.rejectionReason ?? null,
    });
  },

  submit: async (req: Request, res: Response) => {
    const { documentType, frontImageBase64, backImageBase64 } = req.body ?? {};
    if (
      !KYC_DOCUMENT_TYPES.includes(
        documentType as (typeof KYC_DOCUMENT_TYPES)[number],
      )
    ) {
      res.status(400).json({
        error: `documentType must be one of ${KYC_DOCUMENT_TYPES.join(", ")}`,
      });
      return;
    }
    if (typeof frontImageBase64 !== "string" || frontImageBase64.length < 100) {
      res.status(400).json({ error: "frontImageBase64 is required" });
      return;
    }
    if (
      backImageBase64 !== undefined &&
      backImageBase64 !== null &&
      typeof backImageBase64 !== "string"
    ) {
      res.status(400).json({ error: "backImageBase64 must be a string" });
      return;
    }
    const totalSize =
      frontImageBase64.length +
      (typeof backImageBase64 === "string" ? backImageBase64.length : 0);
    if (totalSize > 7_500_000) {
      res
        .status(413)
        .json({ error: "Image trop volumineuse (max ~5MB / face)." });
      return;
    }

    const shopId = new Types.ObjectId(req.params.shopId as string);
    const sellerId = new Types.ObjectId(req.userId);

    const now = new Date();
    await KycDocument.findOneAndUpdate(
      { shopId },
      {
        $set: {
          shopId,
          sellerId,
          documentType,
          frontImageBase64,
          backImageBase64:
            typeof backImageBase64 === "string" ? backImageBase64 : null,
          submittedAt: now,
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      },
      { upsert: true, new: true },
    );

    await Shop.findByIdAndUpdate(shopId, {
      $set: {
        "kyc.status": "pending",
        "kyc.submittedAt": now,
        "kyc.reviewedAt": null,
        "kyc.reviewedBy": null,
        "kyc.rejectionReason": null,
      },
    });

    res.json({
      status: "pending" as const,
      submittedAt: now.toISOString(),
      reviewedAt: null,
      rejectionReason: null,
    });
  },

  // ===== Admin =============================================================
  adminList: async (req: Request, res: Response) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : "pending";
    const allowed = ["unsubmitted", "pending", "approved", "rejected"] as const;
    const filterStatus = allowed.includes(status as (typeof allowed)[number])
      ? (status as (typeof allowed)[number])
      : "pending";
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const pageSize = Math.max(
      1,
      Math.min(100, Math.floor(Number(req.query.pageSize) || 25)),
    );

    const filter: Record<string, unknown> = { "kyc.status": filterStatus };
    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .sort({ "kyc.submittedAt": filterStatus === "pending" ? 1 : -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Shop.countDocuments(filter),
    ]);

    const sellerIds = shops.map((s) => s.sellerId);
    const shopIds = shops.map((s) => s._id);
    const [sellers, docs] = await Promise.all([
      User.find({ _id: { $in: sellerIds } }).select("name email").lean(),
      KycDocument.find({ shopId: { $in: shopIds } })
        .select("shopId documentType")
        .lean(),
    ]);
    const sellerMap = new Map(sellers.map((u) => [String(u._id), u]));
    const docTypeMap = new Map(
      docs.map((d) => [String(d.shopId), d.documentType]),
    );

    res.json({
      items: shops.map((s) => {
        const seller = sellerMap.get(String(s.sellerId));
        const k = s.kyc ?? { status: "unsubmitted" };
        const sid = String(s._id);
        return {
          id: sid,
          shopId: sid,
          shopName: s.name,
          marketName: s.marketName ?? null,
          shopKind: s.kind,
          status: k.status,
          documentType: docTypeMap.get(sid) ?? null,
          submittedAt: k.submittedAt
            ? new Date(k.submittedAt).toISOString()
            : null,
          reviewedAt: k.reviewedAt
            ? new Date(k.reviewedAt).toISOString()
            : null,
          rejectionReason: k.rejectionReason ?? null,
          sellerId: String(s.sellerId),
          sellerName: seller?.name ?? null,
          sellerEmail: seller?.email ?? null,
        };
      }),
      page,
      pageSize,
      total,
    });
  },

  adminPendingCount: async (_req: Request, res: Response) => {
    const count = await Shop.countDocuments({ "kyc.status": "pending" });
    res.json({ count });
  },

  adminGetOne: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.shopId as string)) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const shopId = new Types.ObjectId(req.params.shopId as string);
    const [shop, doc] = await Promise.all([
      Shop.findById(shopId).lean(),
      KycDocument.findOne({ shopId }).lean(),
    ]);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    if (!doc) {
      res.status(404).json({ error: "No KYC document submitted" });
      return;
    }
    const seller = await User.findById(shop.sellerId)
      .select("name email")
      .lean();
    const sid = String(shop._id);
    res.json({
      id: sid,
      shopId: sid,
      shopName: shop.name,
      marketName: shop.marketName ?? null,
      shopKind: shop.kind,
      sellerId: String(shop.sellerId),
      sellerName: seller?.name ?? null,
      sellerEmail: seller?.email ?? null,
      documentType: doc.documentType,
      frontImageBase64: doc.frontImageBase64,
      backImageBase64: doc.backImageBase64 ?? null,
      status: doc.status,
      submittedAt: doc.submittedAt
        ? new Date(doc.submittedAt).toISOString()
        : null,
      reviewedAt: doc.reviewedAt
        ? new Date(doc.reviewedAt).toISOString()
        : null,
      rejectionReason: doc.rejectionReason ?? null,
    });
  },

  adminApprove: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.shopId as string)) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const shopId = new Types.ObjectId(req.params.shopId as string);
    const adminId = req.admin?.id ? new Types.ObjectId(req.admin.id) : null;
    const now = new Date();
    const updatedDoc = await KycDocument.findOneAndUpdate(
      { shopId },
      {
        $set: {
          status: "approved",
          reviewedAt: now,
          reviewedBy: adminId,
          rejectionReason: null,
        },
      },
      { new: true },
    );
    if (!updatedDoc) {
      res.status(404).json({ error: "No KYC document submitted" });
      return;
    }
    await Shop.findByIdAndUpdate(shopId, {
      $set: {
        "kyc.status": "approved",
        "kyc.reviewedAt": now,
        "kyc.reviewedBy": adminId,
        "kyc.rejectionReason": null,
        "serviceProvider.isVerified": true,
      },
    });
    res.json({ ok: true, status: "approved" as const });
  },

  adminReject: async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.shopId as string)) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length < 5) {
      res.status(400).json({
        error: "Une raison de refus claire est requise (≥ 5 caractères).",
      });
      return;
    }
    const shopId = new Types.ObjectId(req.params.shopId as string);
    const adminId = req.admin?.id ? new Types.ObjectId(req.admin.id) : null;
    const now = new Date();
    const updatedDoc = await KycDocument.findOneAndUpdate(
      { shopId },
      {
        $set: {
          status: "rejected",
          reviewedAt: now,
          reviewedBy: adminId,
          rejectionReason: reason,
        },
      },
      { new: true },
    );
    if (!updatedDoc) {
      res.status(404).json({ error: "No KYC document submitted" });
      return;
    }
    await Shop.findByIdAndUpdate(shopId, {
      $set: {
        "kyc.status": "rejected",
        "kyc.reviewedAt": now,
        "kyc.reviewedBy": adminId,
        "kyc.rejectionReason": reason,
        "serviceProvider.isVerified": false,
      },
    });
    res.json({
      ok: true,
      status: "rejected" as const,
      rejectionReason: reason,
    });
  },
};
