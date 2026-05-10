import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { meController } from "../controllers/me";

const router: IRouter = Router();

router.get("/me", requireAuth, meController.getMe);
router.get("/me/karma", requireAuth, meController.getKarma);

router.post("/me/push-tokens", requireAuth, meController.registerPushToken);
router.delete("/me/push-tokens", requireAuth, meController.unregisterPushToken);

router.post("/me/consent", requireAuth, meController.recordConsent);

router.get("/me/basket", requireAuth, meController.getBasket);
router.post("/me/basket/items", requireAuth, meController.addBasketItem);
router.delete(
  "/me/basket/items/:itemId",
  requireAuth,
  meController.removeBasketItem,
);
router.post("/me/basket/clear", requireAuth, meController.clearBasket);
router.post("/me/basket/start-course", requireAuth, meController.startCourse);

export default router;
