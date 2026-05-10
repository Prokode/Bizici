import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  Admin,
  ADMIN_ROLES,
  type AdminRole,
  User,
  Shop,
  ShopMember,
  ShopInvitation,
  Product,
  Category,
  Conversation,
  Message,
  KarmaEvent,
  BroadcastRequest,
  ShopReview,
} from "@workspace/db";
import { recomputeShopRating } from "../lib/reviews";
import {
  hashPassword,
  verifyPassword,
  signAdminToken,
  checkLoginRateLimit,
  clearLoginAttempts,
} from "../lib/adminAuth";

// ----- helpers -------------------------------------------------------------

function objectId(id: unknown): Types.ObjectId | null {
  if (typeof id !== "string") return null;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function clampPage(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function clampPageSize(raw: unknown, max = 100): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 25;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const adminController = {
  // ===== AUTH ==============================================================

  login: async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }
    const uname = username.toLowerCase().trim();
    const limit = checkLoginRateLimit(req, uname);
    if (!limit.allowed) {
      res
        .status(429)
        .set("Retry-After", String(limit.retryAfterSec))
        .json({
          error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSec / 60)} min.`,
        });
      return;
    }
    const admin = await Admin.findOne({ username: uname });
    if (!admin) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }
    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }
    clearLoginAttempts(req, uname);
    admin.lastLoginAt = new Date();
    await admin.save();
    const token = signAdminToken(admin);
    res.json({
      token,
      admin: {
        id: String(admin._id),
        username: admin.username,
        role: admin.role,
        isRoot: Boolean(admin.isRoot),
      },
    });
  },

  getAuthMe: async (req: Request, res: Response) => {
    res.json({ admin: req.admin });
  },

  // ===== ADMINS MANAGEMENT (super_admin only) ==============================

  listAdmins: async (_req: Request, res: Response) => {
    const admins = await Admin.find({})
      .sort({ createdAt: 1 })
      .select("-passwordHash")
      .lean();
    res.json({
      admins: admins.map((a) => ({
        id: String(a._id),
        username: a.username,
        role: a.role,
        isRoot: Boolean(a.isRoot),
        createdAt: a.createdAt,
        lastLoginAt: a.lastLoginAt ?? null,
      })),
    });
  },

  createAdmin: async (req: Request, res: Response) => {
    const { username, password, role } = req.body ?? {};
    if (
      typeof username !== "string" ||
      username.trim().length < 2 ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof role !== "string" ||
      !ADMIN_ROLES.includes(role as AdminRole)
    ) {
      res.status(400).json({
        error:
          "username (>=2 char), password (>=8 char) and a valid role are required",
      });
      return;
    }
    const uname = username.toLowerCase().trim();
    const exists = await Admin.findOne({ username: uname });
    if (exists) {
      res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const admin = await Admin.create({
      username: uname,
      passwordHash,
      role,
      isRoot: false,
      createdBy: new Types.ObjectId(req.admin!.id),
    });
    res.status(201).json({
      admin: {
        id: String(admin._id),
        username: admin.username,
        role: admin.role,
        isRoot: false,
        createdAt: admin.createdAt,
        lastLoginAt: null,
      },
    });
  },

  updateAdmin: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid admin id" });
      return;
    }
    const target = await Admin.findById(oid);
    if (!target) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    const { password, role } = req.body ?? {};
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 8) {
        res
          .status(400)
          .json({ error: "Le mot de passe doit faire au moins 8 caractères" });
        return;
      }
      target.passwordHash = await hashPassword(password);
    }
    if (typeof role === "string") {
      if (!ADMIN_ROLES.includes(role as AdminRole)) {
        res.status(400).json({ error: "Rôle invalide" });
        return;
      }
      if (target.isRoot && role !== "super_admin") {
        res
          .status(400)
          .json({ error: "Le super-admin root ne peut pas être rétrogradé" });
        return;
      }
      target.role = role as AdminRole;
    }
    await target.save();
    res.json({
      admin: {
        id: String(target._id),
        username: target.username,
        role: target.role,
        isRoot: Boolean(target.isRoot),
        createdAt: target.createdAt,
        lastLoginAt: target.lastLoginAt ?? null,
      },
    });
  },

  deleteAdmin: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid admin id" });
      return;
    }
    const target = await Admin.findById(oid);
    if (!target) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    if (target.isRoot) {
      res
        .status(400)
        .json({ error: "Le super-admin root ne peut pas être supprimé" });
      return;
    }
    if (String(target._id) === req.admin!.id) {
      res
        .status(400)
        .json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
      return;
    }
    await target.deleteOne();
    res.json({ ok: true });
  },

  // ===== STATS / DASHBOARD =================================================

  getStats: async (_req: Request, res: Response) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      usersTotal,
      usersThisWeek,
      shopsTotal,
      shopsOpen,
      productsTotal,
      productsOutOfStock,
      conversationsTotal,
      messagesToday,
      messagesTotal,
      karmaEventsTotal,
      broadcastsActive,
      broadcastsTotal,
      invitationsPending,
      categoriesTotal,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Shop.countDocuments({}),
      Shop.countDocuments({ isOpen: true }),
      Product.countDocuments({ deletedAt: null }),
      Product.countDocuments({ deletedAt: null, stockStatus: "out_of_stock" }),
      Conversation.countDocuments({}),
      Message.countDocuments({ createdAt: { $gte: startOfDay } }),
      Message.countDocuments({}),
      KarmaEvent.countDocuments({}),
      BroadcastRequest.countDocuments({ status: "active" }),
      BroadcastRequest.countDocuments({}),
      ShopInvitation.countDocuments({ acceptedAt: null }),
      Category.countDocuments({}),
    ]);

    // Last 7 days messages-per-day series (UTC days, oldest first)
    const series = await Message.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      users: { total: usersTotal, newThisWeek: usersThisWeek },
      shops: { total: shopsTotal, open: shopsOpen },
      products: { total: productsTotal, outOfStock: productsOutOfStock },
      messages: { total: messagesTotal, today: messagesToday },
      conversations: { total: conversationsTotal },
      karma: { events: karmaEventsTotal },
      broadcasts: { active: broadcastsActive, total: broadcastsTotal },
      invitations: { pending: invitationsPending },
      categories: { total: categoriesTotal },
      messagesLast7Days: series.map((d) => ({ date: d._id, count: d.count })),
    });
  },

  // ===== USERS =============================================================

  listUsers: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ email: rx }, { name: rx }, { clerkUserId: rx }];
    }
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        clerkUserId: u.clerkUserId,
        email: u.email ?? null,
        name: u.name ?? null,
        createdAt: u.createdAt,
      })),
      page,
      pageSize,
      total,
    });
  },

  getUser: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    const user = await User.findById(oid).lean();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [shops, memberships, conversationsCount, karmaSum, recentKarma] =
      await Promise.all([
        Shop.find({ sellerId: oid }).lean(),
        ShopMember.find({ userId: oid }).lean(),
        Conversation.countDocuments({ customerUserId: oid }),
        KarmaEvent.aggregate<{ _id: null; total: number }>([
          { $match: { userId: oid } },
          { $group: { _id: null, total: { $sum: "$points" } } },
        ]),
        KarmaEvent.find({ userId: oid })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
      ]);
    res.json({
      user: {
        id: String(user._id),
        clerkUserId: user.clerkUserId,
        email: user.email ?? null,
        name: user.name ?? null,
        createdAt: user.createdAt,
      },
      shopsOwned: shops.map((s) => ({
        id: String(s._id),
        name: s.name,
        marketName: s.marketName ?? null,
        isOpen: s.isOpen,
      })),
      memberships: memberships.map((m) => ({
        shopId: String(m.shopId),
        role: m.role,
      })),
      conversationsCount,
      karma: {
        total: karmaSum[0]?.total ?? 0,
        recent: recentKarma.map((k) => ({
          id: String(k._id),
          kind: k.kind,
          points: k.points,
          note: k.note ?? null,
          createdAt: k.createdAt,
        })),
      },
    });
  },

  deleteUser: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    // Cascade-light: remove memberships, owned shops' conversations stay but we
    // null out customer references in conversations they started? Easier policy:
    // refuse delete if the user owns shops, ask admin to delete those first.
    const ownedShops = await Shop.countDocuments({ sellerId: oid });
    if (ownedShops > 0) {
      res.status(400).json({
        error: `Cet utilisateur possède ${ownedShops} boutique(s). Supprimez-les d'abord.`,
      });
      return;
    }
    await Promise.all([
      User.deleteOne({ _id: oid }),
      ShopMember.deleteMany({ userId: oid }),
      Conversation.deleteMany({ customerUserId: oid }),
      KarmaEvent.deleteMany({ userId: oid }),
    ]);
    res.json({ ok: true });
  },

  // ===== SHOPS =============================================================

  listShops: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { marketName: rx }];
    }
    const [items, total] = await Promise.all([
      Shop.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Shop.countDocuments(filter),
    ]);
    // Hydrate seller info
    const sellerIds = items.map((s) => s.sellerId);
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("name email")
      .lean();
    const sellerMap = new Map(sellers.map((u) => [String(u._id), u]));
    res.json({
      items: items.map((s) => {
        const seller = sellerMap.get(String(s.sellerId));
        return {
          id: String(s._id),
          name: s.name,
          marketName: s.marketName ?? null,
          stallInfo: s.stallInfo ?? null,
          isOpen: s.isOpen,
          location: s.location,
          createdAt: s.createdAt,
          seller: seller
            ? {
                id: String(seller._id),
                name: seller.name ?? null,
                email: seller.email ?? null,
              }
            : null,
        };
      }),
      page,
      pageSize,
      total,
    });
  },

  getShop: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const shop = await Shop.findById(oid).lean();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    const [seller, members, productsCount, conversationsCount] =
      await Promise.all([
        User.findById(shop.sellerId).select("name email").lean(),
        ShopMember.find({ shopId: oid }).lean(),
        Product.countDocuments({ shop: oid, deletedAt: null }),
        Conversation.countDocuments({ shopId: oid }),
      ]);
    // Hydrate member users
    const memberUserIds = members.map((m) => m.userId);
    const memberUsers = await User.find({ _id: { $in: memberUserIds } })
      .select("name email")
      .lean();
    const userMap = new Map(memberUsers.map((u) => [String(u._id), u]));

    res.json({
      shop: {
        id: String(shop._id),
        name: shop.name,
        marketName: shop.marketName ?? null,
        stallInfo: shop.stallInfo ?? null,
        isOpen: shop.isOpen,
        location: shop.location,
        createdAt: shop.createdAt,
        seller: seller
          ? {
              id: String(seller._id),
              name: seller.name ?? null,
              email: seller.email ?? null,
            }
          : null,
      },
      members: members.map((m) => {
        const u = userMap.get(String(m.userId));
        return {
          id: String(m._id),
          userId: String(m.userId),
          role: m.role,
          name: u?.name ?? null,
          email: u?.email ?? null,
        };
      }),
      productsCount,
      conversationsCount,
    });
  },

  updateShop: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const shop = await Shop.findById(oid);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    const { name, marketName, stallInfo, isOpen } = req.body ?? {};
    if (typeof name === "string" && name.trim()) shop.name = name.trim();
    if (typeof marketName === "string")
      shop.marketName = marketName.trim() || null;
    if (typeof stallInfo === "string") shop.stallInfo = stallInfo.trim() || null;
    if (typeof isOpen === "boolean") shop.isOpen = isOpen;
    await shop.save();
    res.json({ ok: true });
  },

  deleteShop: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid shop id" });
      return;
    }
    const shop = await Shop.findById(oid);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    // Soft cascade: delete shop + dependent items
    await Promise.all([
      Shop.deleteOne({ _id: oid }),
      ShopMember.deleteMany({ shopId: oid }),
      ShopInvitation.deleteMany({ shopId: oid }),
      Product.updateMany({ shop: oid }, { $set: { deletedAt: new Date() } }),
      Conversation.deleteMany({ shopId: oid }),
    ]);
    res.json({ ok: true });
  },

  // ===== PRODUCTS ==========================================================

  listProducts: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : "";
    const includeDeleted = req.query.includeDeleted === "true";

    const filter: Record<string, unknown> = {};
    if (!includeDeleted) filter.deletedAt = null;
    if (shopId && objectId(shopId)) filter.shop = new Types.ObjectId(shopId);
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { brand: rx }];
    }
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(filter),
    ]);
    // Hydrate shop names
    const shopIds = items.map((p) => p.shop);
    const shops = await Shop.find({ _id: { $in: shopIds } })
      .select("name")
      .lean();
    const shopMap = new Map(shops.map((s) => [String(s._id), s.name]));
    res.json({
      items: items.map((p) => ({
        id: String(p._id),
        name: p.name,
        brand: p.brand ?? null,
        price: p.price,
        quantity: p.quantity,
        stockStatus: p.stockStatus,
        photos: p.photos ?? [],
        shop: { id: String(p.shop), name: shopMap.get(String(p.shop)) ?? "?" },
        deletedAt: p.deletedAt ?? null,
        createdAt: p.createdAt,
      })),
      page,
      pageSize,
      total,
    });
  },

  deleteProduct: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    // Accept either ?hard=true (canonical) or ?mode=hard (frontend convenience).
    const hard = req.query.hard === "true" || req.query.mode === "hard";
    if (hard) {
      await Product.deleteOne({ _id: oid });
    } else {
      await Product.updateOne({ _id: oid }, { $set: { deletedAt: new Date() } });
    }
    res.json({ ok: true });
  },

  restoreProduct: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const product = await Product.findById(oid);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    product.deletedAt = null;
    await product.save();
    res.json({ ok: true, id: String(product._id) });
  },

  // ===== CATEGORIES ========================================================

  listCategories: async (_req: Request, res: Response) => {
    const items = await Category.find({}).sort({ name: 1 }).lean();
    res.json({
      items: items.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        icon: c.icon ?? null,
        parent: c.parent ? String(c.parent) : null,
        createdAt: c.createdAt,
      })),
    });
  },

  createCategory: async (req: Request, res: Response) => {
    const { name, slug, icon } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const finalSlug =
      typeof slug === "string" && slug.trim()
        ? slug.trim().toLowerCase()
        : name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    const exists = await Category.findOne({ slug: finalSlug });
    if (exists) {
      res.status(409).json({ error: "Ce slug existe déjà" });
      return;
    }
    const cat = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      icon: typeof icon === "string" ? icon : null,
    });
    res.status(201).json({
      category: {
        id: String(cat._id),
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon ?? null,
        parent: null,
        createdAt: cat.createdAt,
      },
    });
  },

  updateCategory: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }
    const cat = await Category.findById(oid);
    if (!cat) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const { name, slug, icon } = req.body ?? {};
    if (typeof name === "string" && name.trim()) cat.name = name.trim();
    if (typeof slug === "string" && slug.trim()) {
      const newSlug = slug.trim().toLowerCase();
      if (newSlug !== cat.slug) {
        const dup = await Category.findOne({ slug: newSlug });
        if (dup) {
          res.status(409).json({ error: "Ce slug existe déjà" });
          return;
        }
        cat.slug = newSlug;
      }
    }
    if (typeof icon === "string") cat.icon = icon;
    await cat.save();
    res.json({ ok: true });
  },

  deleteCategory: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }
    // Pull this category from any product that referenced it
    await Promise.all([
      Category.deleteOne({ _id: oid }),
      Product.updateMany({ categories: oid }, { $pull: { categories: oid } }),
    ]);
    res.json({ ok: true });
  },

  // ===== CONVERSATIONS / MESSAGES MODERATION ===============================

  listConversations: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : "";
    const customerId =
      typeof req.query.customerId === "string" ? req.query.customerId : "";

    const filter: Record<string, unknown> = {};
    if (shopId && objectId(shopId)) filter.shopId = new Types.ObjectId(shopId);
    if (customerId && objectId(customerId))
      filter.customerUserId = new Types.ObjectId(customerId);

    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Conversation.countDocuments(filter),
    ]);
    const shopIds = items.map((c) => c.shopId);
    const userIds = items.map((c) => c.customerUserId);
    const [shops, users] = await Promise.all([
      Shop.find({ _id: { $in: shopIds } }).select("name marketName").lean(),
      User.find({ _id: { $in: userIds } }).select("name email").lean(),
    ]);
    const shopMap = new Map(shops.map((s) => [String(s._id), s]));
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      items: items.map((c) => {
        const shop = shopMap.get(String(c.shopId));
        const u = userMap.get(String(c.customerUserId));
        return {
          id: String(c._id),
          shop: shop
            ? {
                id: String(shop._id),
                name: shop.name,
                marketName: shop.marketName ?? null,
              }
            : null,
          customer: u
            ? { id: String(u._id), name: u.name ?? null, email: u.email ?? null }
            : null,
          lastMessageAt: c.lastMessageAt ?? c.createdAt ?? null,
          lastMessageText: c.lastMessageText ?? "",
          lastMessageSenderRole: c.lastMessageSenderRole ?? null,
          customerUnreadCount: c.customerUnreadCount ?? 0,
          sellerUnreadCount: c.sellerUnreadCount ?? 0,
        };
      }),
      page,
      pageSize,
      total,
    });
  },

  listConversationMessages: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }
    const limit = clampPageSize(req.query.limit, 200);
    const items = await Message.find({ conversationId: oid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      items: items.reverse().map((m) => ({
        id: String(m._id),
        senderUserId: String(m.senderUserId),
        senderRole: m.senderRole,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  },

  deleteMessage: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid message id" });
      return;
    }
    await Message.deleteOne({ _id: oid });
    res.json({ ok: true });
  },

  deleteConversation: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }
    await Promise.all([
      Conversation.deleteOne({ _id: oid }),
      Message.deleteMany({ conversationId: oid }),
    ]);
    res.json({ ok: true });
  },

  // ===== INVITATIONS =======================================================

  listInvitations: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const filter: Record<string, unknown> = {};
    if (typeof req.query.shopId === "string" && objectId(req.query.shopId))
      filter.shopId = new Types.ObjectId(req.query.shopId);
    const [items, total] = await Promise.all([
      ShopInvitation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      ShopInvitation.countDocuments(filter),
    ]);
    const shopIds = items.map((i) => i.shopId);
    const shops = await Shop.find({ _id: { $in: shopIds } })
      .select("name")
      .lean();
    const shopMap = new Map(shops.map((s) => [String(s._id), s.name]));
    res.json({
      items: items.map((i) => ({
        id: String(i._id),
        email: i.email,
        role: i.role,
        shop: { id: String(i.shopId), name: shopMap.get(String(i.shopId)) ?? "?" },
        acceptedAt: i.acceptedAt ?? null,
        createdAt: i.createdAt,
      })),
      page,
      pageSize,
      total,
    });
  },

  deleteInvitation: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid invitation id" });
      return;
    }
    await ShopInvitation.deleteOne({ _id: oid });
    res.json({ ok: true });
  },

  // ===== BROADCASTS ========================================================

  listBroadcasts: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const filter: Record<string, unknown> = {};
    if (typeof req.query.status === "string") filter.status = req.query.status;
    const [items, total] = await Promise.all([
      BroadcastRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      BroadcastRequest.countDocuments(filter),
    ]);
    res.json({
      items: items.map((b) => ({
        id: String(b._id),
        userId: b.userId ?? null,
        query: b.query,
        status: b.status,
        location: b.location,
        createdAt: b.createdAt,
      })),
      page,
      pageSize,
      total,
    });
  },

  deleteBroadcast: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid broadcast id" });
      return;
    }
    await BroadcastRequest.deleteOne({ _id: oid });
    res.json({ ok: true });
  },

  // ===== KARMA EVENTS ======================================================

  listKarmaEvents: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = clampPageSize(req.query.pageSize);
    const filter: Record<string, unknown> = {};
    if (typeof req.query.userId === "string" && objectId(req.query.userId))
      filter.userId = new Types.ObjectId(req.query.userId);
    if (typeof req.query.kind === "string") filter.kind = req.query.kind;
    const [items, total] = await Promise.all([
      KarmaEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      KarmaEvent.countDocuments(filter),
    ]);
    const userIds = items.map((k) => k.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      items: items.map((k) => {
        const u = userMap.get(String(k.userId));
        return {
          id: String(k._id),
          user: u
            ? { id: String(u._id), name: u.name ?? null, email: u.email ?? null }
            : null,
          kind: k.kind,
          points: k.points,
          note: k.note ?? null,
          createdAt: k.createdAt,
        };
      }),
      page,
      pageSize,
      total,
    });
  },

  deleteKarmaEvent: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid karma event id" });
      return;
    }
    await KarmaEvent.deleteOne({ _id: oid });
    res.json({ ok: true });
  },

  // ===== SHOP REVIEWS — moderation =========================================

  listReviews: async (req: Request, res: Response) => {
    const page = clampPage(req.query.page);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize) || 20),
    );
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter: Record<string, unknown> = {};
    if (search.length > 0) {
      filter.comment = { $regex: search, $options: "i" };
    }

    const total = await ShopReview.countDocuments(filter);
    const reviews = await ShopReview.find(filter)
      .populate("customerUserId", "name email")
      .populate("shopId", "name marketName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({
      reviews: reviews.map((r: any) => ({
        id: String(r._id),
        shopId: r.shopId?._id ? String(r.shopId._id) : String(r.shopId),
        shopName: r.shopId?.name ?? null,
        shopMarketName: r.shopId?.marketName ?? null,
        customerUserId: r.customerUserId?._id
          ? String(r.customerUserId._id)
          : String(r.customerUserId),
        customerName: r.customerUserId?.name ?? null,
        customerEmail: r.customerUserId?.email ?? null,
        rating: Number(r.rating ?? 0),
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      page,
      pageSize,
      total,
    });
  },

  deleteReview: async (req: Request, res: Response) => {
    const oid = objectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid review id" });
      return;
    }
    const review = await ShopReview.findOneAndDelete({ _id: oid });
    if (review) {
      try {
        await recomputeShopRating(review.shopId);
      } catch {
        // tolerated — see lib/reviews.ts rationale
      }
    }
    res.json({ ok: true });
  },
};
