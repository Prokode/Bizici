import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shopsTable } from "./shops";

export const productsTable = pgTable("products", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shopId: uuid("shop_id").references(() => shopsTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  price: decimal("price"),
  category: text("category"),
  tags: text("tags").array(),
  imageUrl: text("image_url"),
  stockStatus: text("stock_status", { enum: ["in_stock", "out_of_stock"] }),
  lastVerifiedAt: timestamp("last_verified_at", {
    withTimezone: true,
  }).defaultNow(),
});
