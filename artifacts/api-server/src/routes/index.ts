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

const router: IRouter = Router();

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
