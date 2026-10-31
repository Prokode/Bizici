import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess } from "../lib/auth";
import { productsController } from "../controllers/products";
import { observeCatalogWrite } from "../lib/notifications";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/products",
  requireShopAccess,
  productsController.listForShop,
);

router.post(
  "/shops/:shopId/products",
  requireShopAccess,
  observeCatalogWrite("product", "created"),
  productsController.create,
);

router.patch(
  "/shops/:shopId/products/:id",
  requireShopAccess,
  observeCatalogWrite("product", "updated"),
  productsController.update,
);

router.delete(
  "/shops/:shopId/products/:id",
  requireShopAccess,
  observeCatalogWrite("product", "deleted"),
  productsController.remove,
);

router.post(
  "/shops/:shopId/products/analyze-photo",
  requireShopAccess,
  productsController.analyzePhoto,
);

export default router;
