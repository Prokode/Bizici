import { Router, type IRouter } from "express";
import { servicesPublicController } from "../controllers/services-public";

/**
 * PUBLIC services endpoints — mounted BEFORE any router that uses
 * `router.use(requireAuth)`. Express middleware semantics: a router-level
 * `requireAuth` runs for EVERY request that flows through that router, not
 * only for matched routes. Putting these unauthenticated browse endpoints in
 * a dedicated router (mounted alongside `publicRouter` in `index.ts`)
 * guarantees they short-circuit before reaching shopsRouter / productsRouter.
 */
const router: IRouter = Router();

router.get("/services/search", servicesPublicController.search);
router.get(
  "/services/providers/:shopId",
  servicesPublicController.getProvider,
);
router.get("/services/:id", servicesPublicController.getOne);

export default router;
