import { Router, type IRouter } from "express";
import { healthController } from "../controllers/health";

const router: IRouter = Router();

router.get("/healthz", healthController.check);

export default router;
