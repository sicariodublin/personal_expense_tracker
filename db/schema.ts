import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull().default("Other"),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull().default("expense"),
  note: text("note").notNull().default(""),
});
