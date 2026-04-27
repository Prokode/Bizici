import { Router, type IRouter } from "express";
import { eq, and, sql, isNull } from "drizzle-orm";
import * as Crypto from "node:crypto";
import {
  db,
  shopMembersTable,
  shopInvitationsTable,
  usersTable,
} from "@workspace/db";
import { InviteShopMemberBody } from "@workspace/api-zod";
import {
  requireAuth,
  requireShopAccess,
  requireSeller,
} from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get(
  "/shops/:shopId/members",
  requireShopAccess,
  async (req, res) => {
    const shopId = (req.params.shopId as string);
    const members = await db
      .select({
        id: shopMembersTable.id,
        userId: shopMembersTable.userId,
        role: shopMembersTable.role,
        createdAt: shopMembersTable.createdAt,
        email: usersTable.email,
        name: usersTable.name,
      })
      .from(shopMembersTable)
      .leftJoin(usersTable, eq(usersTable.id, shopMembersTable.userId))
      .where(eq(shopMembersTable.shopId, shopId));

    const invitations = await db
      .select({
        id: shopInvitationsTable.id,
        email: shopInvitationsTable.email,
        role: shopInvitationsTable.role,
        createdAt: shopInvitationsTable.createdAt,
      })
      .from(shopInvitationsTable)
      .where(
        and(
          eq(shopInvitationsTable.shopId, shopId),
          isNull(shopInvitationsTable.acceptedAt),
        ),
      );

    res.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.email,
        name: m.name,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  },
);

router.post(
  "/shops/:shopId/members",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    const shopId = (req.params.shopId as string);
    const body = InviteShopMemberBody.parse(req.body);
    const email = body.email.trim().toLowerCase();

    // If a user with this email already exists and is already a member, short-circuit
    const existingUser = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser[0]) {
      const alreadyMember = await db
        .select()
        .from(shopMembersTable)
        .where(
          and(
            eq(shopMembersTable.shopId, shopId),
            eq(shopMembersTable.userId, existingUser[0].id),
          ),
        )
        .limit(1);
      if (alreadyMember[0]) {
        res
          .status(400)
          .json({ error: "This user is already a member of this shop" });
        return;
      }
    }

    // Check for existing pending invitation
    const existingInvite = await db
      .select({ id: shopInvitationsTable.id })
      .from(shopInvitationsTable)
      .where(
        and(
          eq(shopInvitationsTable.shopId, shopId),
          eq(shopInvitationsTable.email, email),
          isNull(shopInvitationsTable.acceptedAt),
        ),
      )
      .limit(1);
    if (existingInvite[0]) {
      res
        .status(400)
        .json({ error: "An invitation for this email is already pending" });
      return;
    }

    const token = Crypto.randomBytes(24).toString("hex");
    const [created] = await db
      .insert(shopInvitationsTable)
      .values({
        shopId,
        email,
        role: "sub_seller",
        token,
        invitedBy: req.userId,
      })
      .returning();

    res.json({
      id: created!.id,
      email: created!.email,
      role: created!.role,
      createdAt: created!.createdAt.toISOString(),
    });
  },
);

router.delete(
  "/shops/:shopId/members/:userId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    const shopId = (req.params.shopId as string);
    const userId = (req.params.userId as string);
    if (!UUID_RE.test(userId)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    if (userId === req.userId) {
      res.status(400).json({ error: "Sellers cannot remove themselves" });
      return;
    }
    await db
      .delete(shopMembersTable)
      .where(
        and(
          eq(shopMembersTable.shopId, shopId),
          eq(shopMembersTable.userId, userId),
        ),
      );
    res.json({ success: true });
  },
);

router.delete(
  "/shops/:shopId/invitations/:invitationId",
  requireShopAccess,
  requireSeller,
  async (req, res) => {
    const shopId = (req.params.shopId as string);
    const invitationId = (req.params.invitationId as string);
    if (!UUID_RE.test(invitationId)) {
      res.status(400).json({ error: "Invalid invitationId" });
      return;
    }
    await db
      .delete(shopInvitationsTable)
      .where(
        and(
          eq(shopInvitationsTable.id, invitationId),
          eq(shopInvitationsTable.shopId, shopId),
        ),
      );
    res.json({ success: true });
  },
);

export default router;
