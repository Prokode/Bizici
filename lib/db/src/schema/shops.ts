import {
  pgTable,
  uuid,
  text,
  boolean,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    // PostGIS returns hex EWKB by default; we always read via ST_X/ST_Y in queries.
    return { latitude: 0, longitude: 0 };
  },
});

export const shopsTable = pgTable("shops", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: uuid("owner_id"),
  name: text("name").notNull(),
  location: geographyPoint("location").notNull(),
  marketName: text("market_name"),
  stallInfo: text("stall_info"),
  isOpen: boolean("is_open").default(true),
});
