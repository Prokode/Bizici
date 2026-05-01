import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import servicesPublicRouter from "./services-public";
import meRouter from "./me";
import shopsRouter from "./shops";
import productsRouter from "./products";
import servicesRouter from "./services";
import requestsRouter from "./requests";
import membersRouter from "./members";
import invitationsRouter from "./invitations";
import categoriesRouter from "./categories";
import discountsRouter from "./discounts";
import conversationsRouter from "./conversations";
import reviewsRouter from "./reviews";
import appointmentsRouter from "./appointments";
import adminRouter from "./admin";
import kycRouter from "./kyc";

const router: IRouter = Router();

// Admin router MUST be mounted before any router that uses
// `router.use(requireAuth)` — those middlewares run on EVERY request that
// reaches them (Express middleware semantics), even for paths owned by a
// later router, which would otherwise reject our admin login as unauthorized.
router.use(adminRouter);
// KYC router carries both admin and seller endpoints. Mounted right after
// adminRouter so its `/admin/kyc/*` paths are reached before any
// `requireAuth`-mounted router would intercept them.
router.use(kycRouter);
router.use(healthRouter);
router.use(publicRouter);
router.use(servicesPublicRouter);
router.use(meRouter);
router.use(shopsRouter);
router.use(productsRouter);
router.use(servicesRouter);
router.use(requestsRouter);
router.use(membersRouter);
router.use(invitationsRouter);
router.use(categoriesRouter);
router.use(discountsRouter);
router.use(conversationsRouter);
router.use(reviewsRouter);
router.use(appointmentsRouter);

export default router;
