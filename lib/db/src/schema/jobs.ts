import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

export const jobStatusEnum = pgEnum("job_status", [
  "pending_review",
  "open",
  "filled",
  "closed",
  "rejected",
]);

export const jobsTable = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // The account that posted the job: a resident for neighborhood jobs, or
    // the student owner for an opening at their business (businessId set).
    residentId: uuid("resident_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").references(() => businessesTable.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    timing: text("timing").notNull(),
    payText: text("pay_text").notNull(),
    status: jobStatusEnum("status").notNull().default("pending_review"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("jobs_resident_id_idx").on(table.residentId),
    index("jobs_business_id_idx").on(table.businessId),
    index("jobs_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export type Job = typeof jobsTable.$inferSelect;
