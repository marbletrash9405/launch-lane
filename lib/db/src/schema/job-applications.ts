import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";

export const jobApplicationStatusEnum = pgEnum("job_application_status", [
  "pending_review",
  "applied",
  "chosen",
  "guardian_approved",
  "rejected",
  "declined",
  "withdrawn",
]);

export const jobApplicationsTable = pgTable(
  "job_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: jobApplicationStatusEnum("status").notNull().default("pending_review"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("job_applications_job_id_idx").on(table.jobId),
    index("job_applications_student_id_idx").on(table.studentId),
  ],
);

export type JobApplication = typeof jobApplicationsTable.$inferSelect;
