import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { membersController } from "../controllers/members";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/shops/:shopId/members",
  requireShopAccess,
  membersController.list,
);

router.post(
  "/shops/:shopId/members/invite",
  requireShopAccess,
  requireSeller,
  membersController.invite,
);

router.delete(
  "/shops/:shopId/members/:userId",
  requireShopAccess,
  requireSeller,
  membersController.removeMember,
);

router.delete(
  "/shops/:shopId/invitations/:invitationId",
  requireShopAccess,
  requireSeller,
  membersController.removeInvitation,
);

export default router;
