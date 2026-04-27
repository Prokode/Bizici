import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { geographyPoint } from "./shops";

export const broadcastRequestsTable = pgTable("broadcast_requests", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  query: text("query").notNull(),
  location: geographyPoint("location"),
  status: text("status", { enum: ["active", "found", "expired"] }).default(
    "active",
  ),
});
