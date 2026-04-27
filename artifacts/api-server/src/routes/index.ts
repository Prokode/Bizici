import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import shopsRouter from "./shops";
import productsRouter from "./products";
import requestsRouter from "./requests";
import membersRouter from "./members";
import invitationsRouter from "./invitations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(shopsRouter);
router.use(productsRouter);
router.use(requestsRouter);
router.use(membersRouter);
router.use(invitationsRouter);

export default router;
