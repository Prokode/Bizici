import { Types } from "mongoose";
import { Shop, ShopReview } from "@workspace/db";

/**
 * Recompute and persist the denormalized rating aggregates on a shop document.
 *
 * Called after every create/update/delete on a ShopReview so the cheap, hot
 * path (shop list, map markers, public detail) doesn't need to aggregate on
 * every read. Failures are intentionally swallowed by callers — a stale
 * average is preferable to failing the user-visible mutation.
 */
export async function recomputeShopRating(
  shopId: Types.ObjectId,
): Promise<{ ratingAvg: number; ratingCount: number }> {
  const [agg] = await ShopReview.aggregate<{
    _id: null;
    avg: number;
    count: number;
  }>([
    { $match: { shopId } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = agg ? Math.round(agg.avg * 10) / 10 : 0;
  const ratingCount = agg ? agg.count : 0;

  await Shop.updateOne({ _id: shopId }, { $set: { ratingAvg, ratingCount } });

  return { ratingAvg, ratingCount };
}
