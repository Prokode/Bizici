import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { invitationsController } from "../controllers/invitations";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/invitations", invitationsController.listForCurrentUser);
router.post("/invitations/:token/accept", invitationsController.accept);

export default router;
