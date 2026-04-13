import { Router } from "express";
import { db } from "@workspace/db";
import { modelConfigTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { DEFAULT_CONFIG, ModelConfig } from "../lib/fraudEngine";

const router = Router();

export async function getActiveConfig(): Promise<ModelConfig> {
  try {
    const rows = await db
      .select()
      .from(modelConfigTable)
      .orderBy(desc(modelConfigTable.updatedAt))
      .limit(1);

    if (rows[0]) {
      return rows[0].config as ModelConfig;
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

router.get("/", async (req, res) => {
  try {
    const config = await getActiveConfig();
    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to get config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const config = req.body as ModelConfig;

    await db.insert(modelConfigTable).values({ config: config as any });

    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to update config");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
