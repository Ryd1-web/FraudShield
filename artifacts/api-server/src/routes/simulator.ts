import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { analyzeFraud, DEFAULT_CONFIG } from "../lib/fraudEngine";
import { generateBatch } from "../lib/nigerianDataGenerator";
import { getActiveConfig } from "./config";

const router = Router();
const CONFIG_TIMEOUT_MS = 1500;
const PERSIST_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timeout));
  });
}

router.post("/generate", async (req, res) => {
  try {
    const body = req.body;
    const config = await withTimeout(getActiveConfig(), CONFIG_TIMEOUT_MS, DEFAULT_CONFIG);

    const generatorConfig = {
      count: Math.min(Number(body.count) || 10, 100),
      fraudRate: Number(body.fraudRate) ?? 0.15,
      location: body.location || "Lagos",
      amountRange: body.amountRange || { min: 500, max: 200000 },
      transactionTypes: body.transactionTypes || [],
      includeAgentTransactions: body.includeAgentTransactions !== false,
    };

    const rawTxns = generateBatch(generatorConfig);

    const analyzed = rawTxns.map(tx => {
      const analysis = analyzeFraud(tx, config);
      return {
        id: tx.id as string,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency || "NGN",
        senderPhone: tx.senderPhone,
        recipientPhone: tx.recipientPhone || null,
        senderLocation: tx.senderLocation,
        deviceId: tx.deviceId,
        timestamp: tx.timestamp || new Date().toISOString(),
        accountAge: tx.accountAge || 365,
        previousTxCount: tx.previousTxCount || 10,
        riskScore: analysis.riskScore,
        isFraud: analysis.isFraud,
        fraudLabel: analysis.fraudLabel,
        fraudAnalysis: analysis as any,
      };
    });

    let persisted = true;
    try {
      persisted = await withTimeout(
        db.insert(transactionsTable).values(analyzed).then(() => true),
        PERSIST_TIMEOUT_MS,
        false,
      );
    } catch (dbErr) {
      persisted = false;
      req.log.warn({ err: dbErr }, "Generated transactions but could not persist them");
    }

    const fraudulent = analyzed.filter(t => t.fraudLabel === "fraudulent").length;
    const flagged = analyzed.filter(t => t.fraudLabel !== "clean").length;
    const totalAmount = analyzed.reduce((sum, t) => sum + t.amount, 0);
    const avgRiskScore = analyzed.reduce((sum, t) => sum + t.riskScore, 0) / analyzed.length;

    return res.json({
      transactions: analyzed,
      persisted,
      summary: {
        total: analyzed.length,
        flagged,
        fraudulent,
        avgRiskScore: Math.round(avgRiskScore),
        totalAmount: Math.round(totalAmount),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate transactions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    await db.delete(transactionsTable);
    return res.json({ message: "All transaction data has been reset successfully." });
  } catch (err) {
    req.log.error({ err }, "Failed to reset simulator");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
