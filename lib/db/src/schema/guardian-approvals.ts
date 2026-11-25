import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const guardianApprovalTargetEnum = pgEnum("guardian_approval_target", [
  "business",
  "job_application",
]);

export const guardianApprovalDecisionEnum = pgEnum("guardian_approval_decision", [
  "approved",
  "declined",
]);

export const guardianApprovalsTable = pgTable(
  "guardian_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: guardianApprovalTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    decision: guardianApprovalDecisionEnum("decision"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("guardian_approvals_token_hash_unique").on(table.tokenHash)],
);
