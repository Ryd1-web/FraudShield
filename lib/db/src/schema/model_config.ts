import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modelConfigTable = pgTable("model_config", {
  id: serial("id").primaryKey(),
  config: jsonb("config").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertModelConfigSchema = createInsertSchema(modelConfigTable).omit({ id: true, updatedAt: true });
export type InsertModelConfig = z.infer<typeof insertModelConfigSchema>;
export type ModelConfigRow = typeof modelConfigTable.$inferSelect;
