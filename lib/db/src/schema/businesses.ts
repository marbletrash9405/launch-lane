import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const businessStatusEnum = pgEnum("business_status", [
  "pending_review",
  "pending_guardian",
  "live",
  "paused",
  "rejected",
]);

export const businessPauseSourceEnum = pgEnum("business_pause_source", [
  "student",
  "admin",
]);

export const businessesTable = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  pricingText: text("pricing_text").notNull(),
  photoPaths: text("photo_paths").array().notNull().default([]),
  status: businessStatusEnum("status").notNull().default("pending_review"),
  rejectionReason: text("rejection_reason"),
  pausedBy: businessPauseSourceEnum("paused_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Business = typeof businessesTable.$inferSelect;
