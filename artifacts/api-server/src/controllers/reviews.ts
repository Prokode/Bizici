import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Shop, ShopMember, ShopReview } from "@workspace/db";
import { recomputeShopRating } from "../lib/reviews";
import { serializeReview } from "../lib/serialize";

function parseShopId(raw: unknown): Types.ObjectId | null {
  if (typeof raw !== "string") return null;
  return Types.ObjectId.isValid(raw) ? new Types.ObjectId(raw) : null;
}

export const reviewsController = {
  /**
   * Get the current user's review of a given shop, or null if they haven't
   * reviewed it yet. Used by the customer app to pre-fill / toggle the
   * write-review modal between create and edit modes.
   */
  getMine: async (req: Request, res: Response) => {
    const shopId = parseShopId(req.params.shopId);
    if (!shopId) {
      res.status(400).json({ error: "invalid shopId" });
      return;
    }
    const userOid = new Types.ObjectId(req.userId);
    const review = await ShopReview.findOne({
      shopId,
      customerUserId: userOid,
    }).lean();
    res.json(review ? serializeReview(review) : null);
  },

  /**
   * Upsert the current user's review for a shop. A user can only have one
   * review per shop — sending again updates rating/comment.
   *
   * Sellers and sub-sellers of the shop are forbidden from reviewing their own
   * shop (anti-self-rating). The check uses the same ShopMember model that
   * gates seller-side endpoints, so the rule stays consistent if/when role
   * semantics evolve.
   */
  upsertMine: async (req: Request, res: Response) => {
    const shopId = parseShopId(req.params.shopId);
    if (!shopId) {
      res.status(400).json({ error: "invalid shopId" });
      return;
    }

    const { rating, comment } = req.body ?? {};
    const ratingNum = Number(rating);
    if (
      !Number.isFinite(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5 ||
      !Number.isInteger(ratingNum)
    ) {
      res
        .status(400)
        .json({ error: "rating must be an integer between 1 and 5" });
      return;
    }
    let trimmedComment: string | null = null;
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== "string") {
        res.status(400).json({ error: "comment must be a string" });
        return;
      }
      const t = comment.trim();
      if (t.length > 1000) {
        res
          .status(400)
          .json({ error: "comment must be 1000 characters or fewer" });
        return;
      }
      trimmedComment = t.length === 0 ? null : t;
    }

    const userOid = new Types.ObjectId(req.userId);

    // Refuse self-review. We want the API contract to be explicit (403) so the
    // mobile UI can surface a clear message rather than a silent no-op.
    const isMember = await ShopMember.exists({ shopId, userId: userOid });
    if (isMember) {
      res.status(403).json({ error: "Sellers cannot review their own shop" });
      return;
    }

    const shopExists = await Shop.exists({ _id: shopId });
    if (!shopExists) {
      res.status(404).json({ error: "shop not found" });
      return;
    }

    const review = await ShopReview.findOneAndUpdate(
      { shopId, customerUserId: userOid },
      {
        $set: { rating: ratingNum, comment: trimmedComment },
        $setOnInsert: { shopId, customerUserId: userOid },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Best-effort: stale aggregates are tolerable, a failed user write is not.
    try {
      await recomputeShopRating(shopId);
    } catch (err) {
      req.log.error({ err, shopId: String(shopId) }, "recomputeShopRating failed");
    }

    res.status(200).json(serializeReview(review!.toObject()));
  },

  /**
   * Delete the current user's review for the given shop. 204 even when nothing
   * was deleted so the client can use this idempotently as a "clear my review"
   * button.
   */
  deleteMine: async (req: Request, res: Response) => {
    const shopId = parseShopId(req.params.shopId);
    if (!shopId) {
      res.status(400).json({ error: "invalid shopId" });
      return;
    }
    const userOid = new Types.ObjectId(req.userId);
    await ShopReview.deleteOne({ shopId, customerUserId: userOid });
    try {
      await recomputeShopRating(shopId);
    } catch (err) {
      req.log.error({ err, shopId: String(shopId) }, "recomputeShopRating failed");
    }
    res.status(204).end();
  },
};
