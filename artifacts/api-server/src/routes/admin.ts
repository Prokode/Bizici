import { Router, type IRouter } from "express";
import {
  requireAdmin,
  requireSuperAdmin,
  requireWriter,
} from "../lib/adminAuth";
import { adminController } from "../controllers/admin";

const router: IRouter = Router();

// ===== AUTH (login is the only public admin endpoint) =====================
router.post("/admin/auth/login", adminController.login);

// All routes below require an authenticated admin.
router.use("/admin", requireAdmin);

router.get("/admin/auth/me", adminController.getAuthMe);

// ===== ADMINS MANAGEMENT (super_admin only) ===============================
router.get("/admin/admins", requireSuperAdmin, adminController.listAdmins);
router.post("/admin/admins", requireSuperAdmin, adminController.createAdmin);
router.patch(
  "/admin/admins/:id",
  requireSuperAdmin,
  adminController.updateAdmin,
);
router.delete(
  "/admin/admins/:id",
  requireSuperAdmin,
  adminController.deleteAdmin,
);

// ===== STATS / DASHBOARD ==================================================
router.get("/admin/stats", adminController.getStats);

// ===== USERS ==============================================================
router.get("/admin/users", adminController.listUsers);
router.get("/admin/users/:id", adminController.getUser);
router.delete("/admin/users/:id", requireWriter, adminController.deleteUser);

// ===== SHOPS ==============================================================
router.get("/admin/shops", adminController.listShops);
router.get("/admin/shops/:id", adminController.getShop);
router.patch("/admin/shops/:id", requireWriter, adminController.updateShop);
router.delete("/admin/shops/:id", requireWriter, adminController.deleteShop);

// ===== PRODUCTS ===========================================================
router.get("/admin/products", adminController.listProducts);
router.delete(
  "/admin/products/:id",
  requireWriter,
  adminController.deleteProduct,
);
router.post(
  "/admin/products/:id/restore",
  requireWriter,
  adminController.restoreProduct,
);

// ===== CATEGORIES =========================================================
router.get("/admin/categories", adminController.listCategories);
router.post(
  "/admin/categories",
  requireWriter,
  adminController.createCategory,
);
router.patch(
  "/admin/categories/:id",
  requireWriter,
  adminController.updateCategory,
);
router.delete(
  "/admin/categories/:id",
  requireWriter,
  adminController.deleteCategory,
);

// ===== CONVERSATIONS / MESSAGES MODERATION ================================
router.get("/admin/conversations", adminController.listConversations);
router.get(
  "/admin/conversations/:id/messages",
  adminController.listConversationMessages,
);
router.delete("/admin/messages/:id", adminController.deleteMessage);
router.delete(
  "/admin/conversations/:id",
  adminController.deleteConversation,
);

// ===== INVITATIONS ========================================================
router.get("/admin/invitations", adminController.listInvitations);
router.delete(
  "/admin/invitations/:id",
  requireWriter,
  adminController.deleteInvitation,
);

// ===== BROADCASTS =========================================================
router.get("/admin/broadcasts", adminController.listBroadcasts);
router.delete(
  "/admin/broadcasts/:id",
  requireWriter,
  adminController.deleteBroadcast,
);

// ===== KARMA EVENTS =======================================================
router.get("/admin/karma-events", adminController.listKarmaEvents);
router.delete(
  "/admin/karma-events/:id",
  requireWriter,
  adminController.deleteKarmaEvent,
);

// ===== SHOP REVIEWS — moderation ==========================================
router.get("/admin/reviews", adminController.listReviews);
router.delete(
  "/admin/reviews/:id",
  requireWriter,
  adminController.deleteReview,
);

export default router;
