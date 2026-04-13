import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import { analyzeFraud, DEFAULT_CONFIG } from "../lib/fraudEngine";
import { getActiveConfig } from "./config";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const flaggedOnly = req.query.flaggedOnly === "true";

    let query = db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions = await query;

    const filtered = flaggedOnly
      ? transactions.filter(t => t.fraudLabel !== "clean")
      : transactions;

    const totalResult = await db
      .select({ count: count() })
      .from(transactionsTable);

    const total = totalResult[0]?.count || 0;

    res.json({ transactions: filtered, total });
  } catch (err) {
    req.log.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const config = await getActiveConfig();
    const body = req.body;

    const analysis = analyzeFraud(body, config);

    const id = body.id || `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const tx = {
      id,
      type: body.type,
      amount: body.amount,
      currency: body.currency || "NGN",
      senderPhone: body.senderPhone,
      recipientPhone: body.recipientPhone || null,
      senderLocation: body.senderLocation,
      deviceId: body.deviceId,
      timestamp: body.timestamp || now,
      accountAge: body.accountAge || 365,
      previousTxCount: body.previousTxCount || 10,
      riskScore: analysis.riskScore,
      isFraud: analysis.isFraud,
      fraudLabel: analysis.fraudLabel,
      fraudAnalysis: analysis as any,
    };

    const inserted = await db.insert(transactionsTable).values(tx).returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to create transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, req.params.id))
      .limit(1);

    if (!result[0]) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(result[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to get transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
