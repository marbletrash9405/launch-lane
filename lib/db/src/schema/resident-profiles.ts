import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const residentProfilesTable = pgTable("resident_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  homeAddress: text("home_address").notNull(),
  streetName: text("street_name"),
});
