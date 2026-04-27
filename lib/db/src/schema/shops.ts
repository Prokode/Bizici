import {
  pgTable,
  uuid,
  text,
  boolean,
  customType,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const geographyPoint = customType<{
  data: { latitude: number; longitude: number };
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    return { latitude: 0, longitude: 0 };
  },
});

export const shopsTable = pgTable("shops", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: geographyPoint("location").notNull(),
  marketName: text("market_name"),
  stallInfo: text("stall_info"),
  isOpen: boolean("is_open").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
