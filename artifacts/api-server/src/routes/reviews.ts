import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { reviewsController } from "../controllers/reviews";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/me/reviews/:shopId", reviewsController.getMine);
router.post("/me/reviews/:shopId", reviewsController.upsertMine);
router.delete("/me/reviews/:shopId", reviewsController.deleteMine);

export default router;
