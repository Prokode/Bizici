import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopRouter from "./shop";
import productsRouter from "./products";
import requestsRouter from "./requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shopRouter);
router.use(productsRouter);
router.use(requestsRouter);

export default router;
