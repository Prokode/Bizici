import { Router, type IRouter } from "express";
import { requireAuth, requireSeller, requireShopAccess } from "../lib/auth";
import { servicesController } from "../controllers/services";

/**
 * AUTHENTICATED services endpoints. Public browsing is in `services-public.ts`
 * which is mounted earlier in `index.ts` to avoid the router-level requireAuth
 * short-circuit issue (see comment in index.ts).
 */
const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/services",
  requireShopAccess,
  servicesController.list,
);
router.post(
  "/shops/:shopId/services",
  requireShopAccess,
  servicesController.create,
);
router.patch(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  servicesController.update,
);
router.delete(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  servicesController.remove,
);

router.get(
  "/shops/:shopId/provider-profile",
  requireShopAccess,
  servicesController.getProviderProfile,
);
router.patch(
  "/shops/:shopId/provider-profile",
  requireShopAccess,
  // The provider profile is the shop owner's PERSONAL identity (name, age,
  // bio, certifications, portfolio). Sub-sellers can manage inventory but
  // must never be able to overwrite the owner's personal data.
  requireSeller,
  servicesController.updateProviderProfile,
);

export default router;
