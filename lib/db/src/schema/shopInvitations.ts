import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shopsTable } from "./shops";
import { usersTable } from "./users";
import { shopRoleEnum } from "./shopMembers";

export const shopInvitationsTable = pgTable(
  "shop_invitations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: shopRoleEnum("role").notNull().default("sub_seller"),
    token: text("token").notNull().unique(),
    clerkInvitationId: text("clerk_invitation_id"),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("shop_invitations_email_idx").on(t.email)],
);
