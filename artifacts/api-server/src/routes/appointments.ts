import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { appointmentsController } from "../controllers/appointments";

const router: IRouter = Router();

router.use("/me/appointments", requireAuth);

router.post("/me/appointments", appointmentsController.create);
router.get("/me/appointments", appointmentsController.list);
router.get("/me/appointments/:id", appointmentsController.getOne);
router.post("/me/appointments/:id/accept", appointmentsController.accept);
router.post("/me/appointments/:id/decline", appointmentsController.decline);
router.post("/me/appointments/:id/complete", appointmentsController.complete);
router.post("/me/appointments/:id/cancel", appointmentsController.cancel);
router.get(
  "/me/appointments/:id/reviews",
  appointmentsController.listReviews,
);
router.post(
  "/me/appointments/:id/reviews",
  appointmentsController.upsertReview,
);

export default router;
