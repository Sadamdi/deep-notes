import { Router } from "express";
import { accountRoutes } from "./modules/account/account.routes.js";
import { answerRoutes } from "./modules/answers/answers.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { companionPublicRoutes, companionRoutes } from "./modules/companion/companion.routes.js";
import { extrasRoutes } from "./modules/extras/extras.routes.js";
import { groupRoutes, profileRoutes } from "./modules/group/group.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { inviteRoutes, notebookRoutes, publicRoutes } from "./modules/notebooks/notebooks.routes.js";
import { quizRoutes } from "./modules/quizzes/quizzes.routes.js";
import { sourceRoutes } from "./modules/sources/sources.routes.js";

/** Mount every feature module here. The /api/v1 prefix is applied in app.ts. */
export const apiRouter = Router();
apiRouter.use("/health", healthRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/me", accountRoutes);
apiRouter.use("/me", profileRoutes);
apiRouter.use("/invites", inviteRoutes);
apiRouter.use("/public", publicRoutes);
apiRouter.use("/notebooks/:id/sources", sourceRoutes);
apiRouter.use("/notebooks/:id/quizzes", quizRoutes);
apiRouter.use("/companion", companionPublicRoutes);
apiRouter.use("/notebooks/:id/companion", companionRoutes);
apiRouter.use("/notebooks/:id", answerRoutes);
apiRouter.use("/notebooks/:id", extrasRoutes);
apiRouter.use("/notebooks/:id", groupRoutes);
apiRouter.use("/notebooks", notebookRoutes);
