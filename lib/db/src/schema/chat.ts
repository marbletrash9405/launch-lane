import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";
import { jobApplicationsTable } from "./job-applications";
import { usersTable } from "./users";

export const chatRoleEnum = pgEnum("chat_role", [
  "student",
  "guardian",
  "resident",
  "admin",
]);
export const chatReportStatusEnum = pgEnum("chat_report_status", [
  "open",
  "resolved",
]);

export const chatThreadsTable = pgTable(
  "chat_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").references(() => bookingsTable.id, {
      onDelete: "cascade",
    }),
    jobApplicationId: uuid("job_application_id").references(
      () => jobApplicationsTable.id,
      { onDelete: "cascade" },
    ),
    studentId: uuid("student_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    guardianEmail: text("guardian_email").notNull(),
    locked: boolean("locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "chat_threads_exactly_one_source_check",
      sql`num_nonnulls(${table.bookingId}, ${table.jobApplicationId}) = 1`,
    ),
    uniqueIndex("chat_threads_booking_unique")
      .on(table.bookingId)
      .where(sql`${table.bookingId} IS NOT NULL`),
    uniqueIndex("chat_threads_job_application_unique")
      .on(table.jobApplicationId)
      .where(sql`${table.jobApplicationId} IS NOT NULL`),
    index("chat_threads_student_idx").on(table.studentId),
    index("chat_threads_resident_idx").on(table.residentId),
  ],
);

export const chatThreadParticipantsTable = pgTable(
  "chat_thread_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreadsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    role: chatRoleEnum("role").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_thread_participants_thread_email_unique").on(
      table.threadId,
      sql`lower(${table.email})`,
    ),
    index("chat_thread_participants_user_idx").on(table.userId),
  ],
);

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreadsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    senderRole: chatRoleEnum("sender_role").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
  ],
);

export const chatMessageReportsTable = pgTable(
  "chat_message_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessagesTable.id, { onDelete: "cascade" }),
    messageText: text("message_text").notNull(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reason: text("reason"),
    status: chatReportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_message_reports_message_reporter_unique").on(
      table.messageId,
      table.reporterId,
    ),
    index("chat_message_reports_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);
