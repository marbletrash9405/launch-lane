import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const emailLogStatusEnum = pgEnum("email_log_status", [
  "logged",
  "sent",
  "failed",
]);

export const emailLogsTable = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    to: text("to").array().notNull().default([]),
    cc: text("cc").array().notNull().default([]),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    status: emailLogStatusEnum("status").notNull(),
    detail: text("detail"),
  },
  (table) => [index("email_logs_created_at_idx").on(table.createdAt)],
);

export type EmailLogEntry = typeof emailLogsTable.$inferSelect;
