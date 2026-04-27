import {
  pgTable,
  uuid,
  pgEnum,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shopsTable } from "./shops";
import { usersTable } from "./users";

export const shopRoleEnum = pgEnum("shop_role", ["seller", "sub_seller"]);

export const shopMembersTable = pgTable(
  "shop_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: shopRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("shop_members_shop_user_uniq").on(t.shopId, t.userId)],
);
