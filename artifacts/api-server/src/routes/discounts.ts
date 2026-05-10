import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { discountsController } from "../controllers/discounts";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/products/:productId/discounts",
  requireShopAccess,
  discountsController.listForProduct,
);

router.post(
  "/shops/:shopId/products/:productId/discounts",
  requireShopAccess,
  requireSeller,
  discountsController.create,
);

router.delete(
  "/shops/:shopId/products/:productId/discounts/:discountId",
  requireShopAccess,
  requireSeller,
  discountsController.remove,
);

export default router;
