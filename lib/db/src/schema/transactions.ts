import { pgTable, text, serial, real, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  senderPhone: text("sender_phone").notNull(),
  recipientPhone: text("recipient_phone"),
  senderLocation: text("sender_location").notNull(),
  deviceId: text("device_id").notNull(),
  timestamp: text("timestamp").notNull(),
  accountAge: integer("account_age").notNull(),
  previousTxCount: integer("previous_tx_count").notNull(),
  riskScore: real("risk_score").notNull(),
  isFraud: boolean("is_fraud").notNull(),
  fraudLabel: text("fraud_label").notNull(),
  fraudAnalysis: jsonb("fraud_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
