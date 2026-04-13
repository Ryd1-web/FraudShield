import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq, desc, ne } from "drizzle-orm";
import { analyzeFraud } from "../lib/fraudEngine";
import { getActiveConfig } from "./config";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.post("/analyze", async (req, res) => {
  try {
    const config = await getActiveConfig();
    const body = req.body;
    const analysis = analyzeFraud(body, config);
    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Failed to analyze fraud");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const flagged = await db
      .select()
      .from(transactionsTable)
      .where(ne(transactionsTable.fraudLabel, "clean"))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit);

    const alerts = flagged.map(tx => {
      const severity =
        tx.riskScore >= 85
          ? "critical"
          : tx.riskScore >= 70
          ? "high"
          : tx.riskScore >= 40
          ? "medium"
          : "low";

      const analysis = tx.fraudAnalysis as any;

      return {
        id: `ALERT-${uuidv4().substring(0, 8).toUpperCase()}`,
        transactionId: tx.id,
        severity,
        riskScore: tx.riskScore,
        amount: tx.amount,
        senderPhone: tx.senderPhone,
        type: tx.type,
        timestamp: tx.timestamp,
        explanation: analysis?.explanation || "Transaction flagged by fraud detection system",
        triggeredRules: analysis?.triggeredRules || [],
      };
    });

    res.json({ alerts });
  } catch (err) {
    req.log.error({ err }, "Failed to get fraud alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
