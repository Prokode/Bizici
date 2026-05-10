import { Router, type IRouter } from "express";
import { requireAuth, requireShopAccess, requireSeller } from "../lib/auth";
import { requireAdmin, requireWriter } from "../lib/adminAuth";
import { kycController } from "../controllers/kyc";

const router: IRouter = Router();

// ===== Seller-facing =====================================================
router.get(
  "/shops/:shopId/kyc/status",
  requireAuth,
  requireShopAccess,
  kycController.getStatus,
);

router.post(
  "/shops/:shopId/kyc/submit",
  requireAuth,
  requireShopAccess,
  requireSeller,
  kycController.submit,
);

// ===== Admin =============================================================
// `requireAdmin` is applied PER-ROUTE rather than via `router.use(...)`
// because router-level middleware on a Router mounted at "/" runs for EVERY
// request that flows through it (including unrelated paths like /healthz),
// which would 401 the entire app.
router.get("/admin/kyc", requireAdmin, kycController.adminList);
router.get(
  "/admin/kyc/pending-count",
  requireAdmin,
  kycController.adminPendingCount,
);
router.get("/admin/kyc/:shopId", requireAdmin, kycController.adminGetOne);
router.post(
  "/admin/kyc/:shopId/approve",
  requireAdmin,
  requireWriter,
  kycController.adminApprove,
);
router.post(
  "/admin/kyc/:shopId/reject",
  requireAdmin,
  requireWriter,
  kycController.adminReject,
);

export default router;
