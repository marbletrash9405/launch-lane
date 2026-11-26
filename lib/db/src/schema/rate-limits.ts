import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Shared request counters for rate limits, so limits hold across every
// serverless instance instead of each instance counting on its own.
export const rateLimitsTable = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    hits: integer("hits").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limits_reset_at_idx").on(table.resetAt)],
);
