import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const studentProfilesTable = pgTable(
  "student_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    age: integer("age").notNull(),
    homeAddress: text("home_address").notNull(),
    guardianName: text("guardian_name").notNull(),
    guardianEmail: text("guardian_email").notNull(),
  },
  (table) => [
    check(
      "student_profiles_age_13_to_18",
      sql`${table.age} >= 13 AND ${table.age} <= 18`,
    ),
  ],
);
