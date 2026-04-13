import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import simulatorRouter from "./simulator";
import fraudRouter from "./fraud";
import analyticsRouter from "./analytics";
import configRouter from "./config";

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/transactions", transactionsRouter);
router.use("/simulator", simulatorRouter);
router.use("/fraud", fraudRouter);
router.use("/analytics", analyticsRouter);
router.use("/config", configRouter);

export default router;
