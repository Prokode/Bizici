import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { shopsController } from "../controllers/shops";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/shops", shopsController.listMine);
router.post("/shops", shopsController.create);

router.get("/shops/:shopId", requireShopAccess, shopsController.getOne);
router.put(
  "/shops/:shopId",
  requireShopAccess,
  requireSeller,
  shopsController.update,
);
router.patch(
  "/shops/:shopId/open",
  requireShopAccess,
  shopsController.setOpen,
);
router.get("/shops/:shopId/qr", requireShopAccess, shopsController.getQr);
router.get(
  "/shops/:shopId/dashboard",
  requireShopAccess,
  shopsController.dashboard,
);
router.get(
  "/shops/:shopId/summary",
  requireShopAccess,
  shopsController.summary,
);

export default router;
