import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess } from "../lib/auth";
import { requestsController } from "../controllers/requests";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/requests",
  requireShopAccess,
  requestsController.listForShop,
);

router.post(
  "/shops/:shopId/requests/:id/found",
  requireShopAccess,
  requestsController.markFound,
);

router.post(
  "/shops/:shopId/requests/:id/expire",
  requireShopAccess,
  requestsController.markExpired,
);

export default router;
