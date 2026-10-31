import { Router, type IRouter, type RequestHandler } from "express";
import { requireAuth, requireSeller, requireShopAccess } from "../lib/auth";
import { servicesController } from "../controllers/services";
import { categoriesController } from "../controllers/categories";
import { observeCatalogWrite } from "../lib/notifications";

/**
 * AUTHENTICATED services endpoints. Public browsing is in `services-public.ts`
 * which is mounted earlier in `index.ts` to avoid the router-level requireAuth
 * short-circuit issue (see comment in index.ts).
 */
const router: IRouter = Router();
// Express's HTML error page is not useful in native service forms.
const serviceWrite = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const invalid = name === "ValidationError" || name === "CastError";
    req.log.error({ err: error }, "Service write failed");
    res.status(invalid ? 400 : 500).json({
      error: invalid
        ? "Vérifiez le titre, le prix et la durée du service."
        : "Impossible d’enregistrer le service pour le moment. Veuillez réessayer.",
    });
  }
};
router.use(requireAuth);
router.post("/shops/:shopId/service-categories", requireShopAccess, categoriesController.createService);

router.get(
  "/shops/:shopId/services",
  requireShopAccess,
  servicesController.list,
);
router.post(
  "/shops/:shopId/services",
  requireShopAccess,
  observeCatalogWrite("service", "created"),
  serviceWrite(servicesController.create),
);
router.patch(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  observeCatalogWrite("service", "updated"),
  serviceWrite(servicesController.update),
);
router.delete(
  "/shops/:shopId/services/:id",
  requireShopAccess,
  observeCatalogWrite("service", "deleted"),
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
