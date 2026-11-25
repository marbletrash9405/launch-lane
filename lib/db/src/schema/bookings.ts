import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "accepted",
  "declined",
  "completed",
  "cancelled",
]);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    preferredTiming: text("preferred_timing").notNull().default(""),
    status: bookingStatusEnum("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_business_id_idx").on(table.businessId),
    index("bookings_resident_id_idx").on(table.residentId),
  ],
);

export type Booking = typeof bookingsTable.$inferSelect;
