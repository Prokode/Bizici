import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { categoriesController } from "../controllers/categories";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/categories", categoriesController.list);

export default router;
