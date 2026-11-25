import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "student", "resident", "guardian"]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authId: text("auth_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_auth_id_unique").on(table.authId),
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_single_admin_unique")
      .on(table.role)
      .where(sql`${table.role} = 'admin'`),
  ],
);

export type User = typeof usersTable.$inferSelect;
