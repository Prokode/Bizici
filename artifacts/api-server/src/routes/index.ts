import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import meRouter from "./me";
import shopsRouter from "./shops";
import productsRouter from "./products";
import requestsRouter from "./requests";
import membersRouter from "./members";
import invitationsRouter from "./invitations";
import categoriesRouter from "./categories";
import discountsRouter from "./discounts";
import conversationsRouter from "./conversations";
import adminRouter from "./admin";

const router: IRouter = Router();

// Admin router MUST be mounted before any router that uses
// `router.use(requireAuth)` — those middlewares run on EVERY request that
// reaches them (Express middleware semantics), even for paths owned by a
// later router, which would otherwise reject our admin login as unauthorized.
router.use(adminRouter);
router.use(healthRouter);
router.use(publicRouter);
router.use(meRouter);
router.use(shopsRouter);
router.use(productsRouter);
router.use(requestsRouter);
router.use(membersRouter);
router.use(invitationsRouter);
router.use(categoriesRouter);
router.use(discountsRouter);
router.use(conversationsRouter);

export default router;
