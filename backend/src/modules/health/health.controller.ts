import { asyncHandler } from "../../middleware/asyncHandler.js";
import { ok } from "../../lib/apiResponse.js";
import { healthService } from "./health.service.js";

export const check = asyncHandler((_req, res) => {
  res.json(ok(healthService.check()));
});
