import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { conversationsController } from "../controllers/conversations";

const router: IRouter = Router();

// All conversation endpoints require auth.
router.use("/conversations", requireAuth);

router.post("/conversations", conversationsController.createOrGet);
router.get("/conversations", conversationsController.list);
router.get("/conversations/:id", conversationsController.getOne);
router.get(
  "/conversations/:id/messages",
  conversationsController.listMessages,
);
router.post(
  "/conversations/:id/messages",
  conversationsController.postMessage,
);
router.post("/conversations/:id/read", conversationsController.markRead);

export default router;
