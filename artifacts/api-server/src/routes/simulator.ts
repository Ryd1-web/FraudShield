import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { analyzeFraud } from "../lib/fraudEngine";
import { generateBatch } from "../lib/nigerianDataGenerator";
import { getActiveConfig } from "./config";

const router = Router();

router.post("/generate", async (req, res) => {
  try {
    const body = req.body;
    const config = await getActiveConfig();

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

    await db.insert(transactionsTable).values(analyzed);

    const fraudulent = analyzed.filter(t => t.fraudLabel === "fraudulent").length;
    const flagged = analyzed.filter(t => t.fraudLabel !== "clean").length;
    const totalAmount = analyzed.reduce((sum, t) => sum + t.amount, 0);
    const avgRiskScore = analyzed.reduce((sum, t) => sum + t.riskScore, 0) / analyzed.length;

    res.json({
      transactions: analyzed,
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    await db.delete(transactionsTable);
    res.json({ message: "All transaction data has been reset successfully." });
  } catch (err) {
    req.log.error({ err }, "Failed to reset simulator");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
