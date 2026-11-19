import { Router } from "express";
import { healthRoutes } from "./modules/health/health.routes.js";

/** Mount every feature module here. The /api/v1 prefix is applied in app.ts. */
export const apiRouter = Router();
apiRouter.use("/health", healthRoutes);
