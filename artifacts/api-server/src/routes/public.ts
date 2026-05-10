import express, { Router, type IRouter } from "express";
import { publicController } from "../controllers/public";

const router: IRouter = Router();

// Larger body parser used ONLY by the visual-search route below so we can
// accept a base64-encoded photo without widening the global 100kb limit
// across the whole API surface.
const visualSearchBodyParser = express.json({ limit: "10mb" });

/**
 * Public, unauthenticated endpoints used by the customer (NearBuy) app.
 * Auth is intentionally NOT required — anyone can browse open shops on the map.
 */
router.get("/public/shops", publicController.listShops);
router.get("/public/search", publicController.search);
router.post(
  "/public/visual-search",
  visualSearchBodyParser,
  publicController.visualSearch,
);
router.get("/public/shops/:shopId", publicController.getShop);
router.get(
  "/public/shops/:shopId/reviews",
  publicController.listShopReviews,
);
router.post(
  "/public/account-deletion-requests",
  publicController.createAccountDeletionRequest,
);

export default router;
