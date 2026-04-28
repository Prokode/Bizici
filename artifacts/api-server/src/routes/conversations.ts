import { Router, type IRouter, type Request, type Response } from "express";
import { Types } from "mongoose";
import {
  Conversation,
  type ConversationDoc,
  Message,
  Shop,
  ShopMember,
  User,
} from "@workspace/db";

import { requireAuth, getShopAccess } from "../lib/auth";
import { sendPushToUsers } from "../lib/push";

const router: IRouter = Router();

// ---- helpers --------------------------------------------------------------

type Role = "customer" | "seller";

function objectId(id: string | string[] | undefined): Types.ObjectId | null {
  if (typeof id !== "string") return null;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function asId(id: string | string[] | undefined): string | null {
  return typeof id === "string" ? id : null;
}

async function resolveRole(
  userId: string,
  conv: Pick<ConversationDoc, "customerUserId" | "shopId">,
): Promise<Role | null> {
  const userOid = new Types.ObjectId(userId);
  if (conv.customerUserId.equals(userOid)) return "customer";
  const access = await getShopAccess(userId, String(conv.shopId));
  return access ? "seller" : null;
}

type EnrichedConversation = {
  id: string;
  shop: { id: string; name: string; marketName: string | null };
  customer: { id: string; name: string | null; email: string | null };
  lastMessageAt: string;
  lastMessageText: string;
  lastMessageSenderRole: Role | null;
  unreadCount: number;
  myRole: Role;
};

async function enrich(
  conv: ConversationDoc,
  myRole: Role,
): Promise<EnrichedConversation | null> {
  const [shop, customer] = await Promise.all([
    Shop.findById(conv.shopId).lean(),
    User.findById(conv.customerUserId).lean(),
  ]);
  if (!shop || !customer) return null;
  return {
    id: String(conv._id),
    shop: {
      id: String(shop._id),
      name: shop.name,
      marketName: shop.marketName ?? null,
    },
    customer: {
      id: String(customer._id),
      name: customer.name ?? null,
      // Only expose customer email to the seller, never echo it back to customer.
      email: myRole === "seller" ? (customer.email ?? null) : null,
    },
    lastMessageAt: (conv.lastMessageAt ?? conv.createdAt ?? new Date()).toISOString(),
    lastMessageText: conv.lastMessageText ?? "",
    lastMessageSenderRole: (conv.lastMessageSenderRole as Role | null) ?? null,
    unreadCount:
      myRole === "customer"
        ? (conv.customerUnreadCount ?? 0)
        : (conv.sellerUnreadCount ?? 0),
    myRole,
  };
}

// ---- routes ---------------------------------------------------------------

// All conversation endpoints require auth.
router.use("/conversations", requireAuth);

// POST /conversations { shopId } → idempotent get-or-create as customer
router.post("/conversations", async (req: Request, res: Response) => {
  const { shopId } = req.body ?? {};
  if (typeof shopId !== "string" || !objectId(shopId)) {
    res.status(400).json({ error: "shopId must be a valid ObjectId" });
    return;
  }
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  const access = await getShopAccess(req.userId, shopId);
  if (access) {
    res.status(400).json({
      error:
        "You are a member of this shop. Sellers cannot start a conversation as a customer.",
    });
    return;
  }

  const customerOid = new Types.ObjectId(req.userId);
  const shopOid = new Types.ObjectId(shopId);
  let conv;
  try {
    conv = await Conversation.findOneAndUpdate(
      { shopId: shopOid, customerUserId: customerOid },
      {
        $setOnInsert: {
          shopId: shopOid,
          customerUserId: customerOid,
          lastMessageAt: new Date(),
          lastMessageText: "",
          lastMessageSenderRole: null,
          customerUnreadCount: 0,
          sellerUnreadCount: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err: unknown) {
    // Two concurrent upserts may both attempt INSERT and one will hit the
    // unique {shopId, customerUserId} index — fall back to a plain read so
    // the endpoint stays idempotent under load.
    const code = (err as { code?: number } | null)?.code;
    if (code === 11000) {
      conv = await Conversation.findOne({
        shopId: shopOid,
        customerUserId: customerOid,
      });
    } else {
      throw err;
    }
  }
  if (!conv) {
    res.status(500).json({ error: "Failed to create conversation" });
    return;
  }

  const enriched = await enrich(conv as ConversationDoc, "customer");
  if (!enriched) {
    res.status(500).json({ error: "Failed to enrich conversation" });
    return;
  }
  res.status(200).json({ conversation: enriched });
});

// GET /conversations → list user's conversations (customer + seller views)
router.get("/conversations", async (req: Request, res: Response) => {
  const userOid = new Types.ObjectId(req.userId);

  // Find shops where this user is a seller / sub_seller
  const sellerShopIds = await ShopMember.find({ userId: userOid })
    .select({ shopId: 1, _id: 0 })
    .lean();
  const sellerShopOids = sellerShopIds.map((m: { shopId: Types.ObjectId }) => m.shopId);

  const convs = await Conversation.find({
    $or: [
      { customerUserId: userOid },
      ...(sellerShopOids.length > 0 ? [{ shopId: { $in: sellerShopOids } }] : []),
    ],
  })
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .lean();

  const enriched = (
    await Promise.all(
      convs.map(async (c: ConversationDoc) => {
        const role: Role = c.customerUserId.equals(userOid) ? "customer" : "seller";
        return enrich(c as ConversationDoc, role);
      }),
    )
  ).filter((x: EnrichedConversation | null): x is EnrichedConversation => x !== null);

  res.json({ conversations: enriched });
});

// GET /conversations/:id → single conversation detail
router.get("/conversations/:id", async (req: Request, res: Response) => {
  const id = asId(req.params.id);
  if (!id || !objectId(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const conv = await Conversation.findById(id);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const role = await resolveRole(req.userId, conv);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const enriched = await enrich(conv, role);
  if (!enriched) {
    res.status(500).json({ error: "Failed to enrich conversation" });
    return;
  }
  res.json({ conversation: enriched });
});

// GET /conversations/:id/messages?before=ISO&limit=50
router.get("/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = asId(req.params.id);
  if (!id || !objectId(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const conv = await Conversation.findById(id);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const role = await resolveRole(req.userId, conv);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let before: Date | null = null;
  if (req.query.before !== undefined) {
    if (typeof req.query.before !== "string" || req.query.before.length === 0) {
      res.status(400).json({
        error:
          "Invalid 'before' query: must be a single ISO-8601 datetime string",
      });
      return;
    }
    const parsed = new Date(req.query.before);
    if (Number.isNaN(parsed.getTime())) {
      res
        .status(400)
        .json({ error: "Invalid 'before' query: must be an ISO-8601 datetime" });
      return;
    }
    before = parsed;
  }
  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);

  const filter: Record<string, unknown> = { conversationId: conv._id };
  if (before) {
    filter.createdAt = { $lt: before };
  }

  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return in chronological order (oldest → newest) for FlatList inverted convenience.
  docs.reverse();

  res.json({
    messages: docs.map((m: any) => ({
      id: String(m._id),
      conversationId: String(m.conversationId),
      senderRole: m.senderRole,
      text: m.text,
      createdAt: (m.createdAt ?? new Date()).toISOString(),
      mine: m.senderUserId.equals(new Types.ObjectId(req.userId)),
    })),
    hasMore: docs.length === limit,
  });
});

// POST /conversations/:id/messages { text }
router.post("/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = asId(req.params.id);
  if (!id || !objectId(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  if (text.length > 2000) {
    res.status(400).json({ error: "text too long (max 2000 chars)" });
    return;
  }
  const conv = await Conversation.findById(id);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const role = await resolveRole(req.userId, conv);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Single round-trip insert (avoids the Mongoose 9.5 pre-save bug).
  const [msg] = await Message.insertMany([
    {
      conversationId: conv._id,
      senderUserId: new Types.ObjectId(req.userId),
      senderRole: role,
      text,
    },
  ]);

  if (!msg) {
    res.status(500).json({ error: "Failed to create message" });
    return;
  }

  // Bump conversation summary + unread counters.
  const otherUnreadField =
    role === "customer" ? "sellerUnreadCount" : "customerUnreadCount";
  const myUnreadField =
    role === "customer" ? "customerUnreadCount" : "sellerUnreadCount";

  await Conversation.updateOne(
    { _id: conv._id },
    {
      $set: {
        lastMessageAt: msg.createdAt ?? new Date(),
        lastMessageText: text,
        lastMessageSenderRole: role,
        [myUnreadField]: 0,
      },
      $inc: { [otherUnreadField]: 1 },
    },
  );

  res.status(201).json({
    message: {
      id: String(msg._id),
      conversationId: String(msg.conversationId),
      senderRole: role,
      text: msg.text,
      createdAt: (msg.createdAt ?? new Date()).toISOString(),
      mine: true,
    },
  });

  // Fire-and-forget push notification to the OTHER side. We do this AFTER
  // sending the response so the client never waits on Expo's servers; failures
  // are logged inside sendPushToUsers and never surface to the user.
  void (async () => {
    try {
      // Resolve recipient user ids
      let recipientUserIds: Types.ObjectId[] = [];
      if (role === "customer") {
        // Notify every seller / sub_seller of this shop
        const members = await ShopMember.find({ shopId: conv.shopId })
          .select({ userId: 1, _id: 0 })
          .lean();
        recipientUserIds = members.map(
          (m: { userId: Types.ObjectId }) => m.userId,
        );
      } else {
        recipientUserIds = [conv.customerUserId];
      }

      // Resolve a friendly title based on the shop name (sellers know their
      // shop, customers see the boutique they wrote to).
      const shop = await Shop.findById(conv.shopId)
        .select({ name: 1, _id: 0 })
        .lean();
      const shopName = shop?.name ?? "NearBuy";

      let title: string;
      if (role === "customer") {
        const sender = await User.findById(req.userId)
          .select({ name: 1, _id: 0 })
          .lean();
        const senderLabel = sender?.name?.trim() || "Un client";
        title = `${senderLabel} · ${shopName}`;
      } else {
        title = shopName;
      }

      // Truncate body so the OS preview stays readable.
      const body = text.length > 140 ? `${text.slice(0, 137)}…` : text;

      await sendPushToUsers(recipientUserIds, {
        title,
        body,
        threadId: String(conv._id),
        data: {
          type: "chat_message",
          conversationId: String(conv._id),
          shopId: String(conv.shopId),
          senderRole: role,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to send chat push notification");
    }
  })();
});

// POST /conversations/:id/read → reset current side's unread to 0
router.post("/conversations/:id/read", async (req: Request, res: Response) => {
  const id = asId(req.params.id);
  if (!id || !objectId(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const conv = await Conversation.findById(id);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const role = await resolveRole(req.userId, conv);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const field = role === "customer" ? "customerUnreadCount" : "sellerUnreadCount";
  await Conversation.updateOne({ _id: conv._id }, { $set: { [field]: 0 } });
  res.json({ ok: true });
});

export default router;
