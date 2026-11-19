import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors.js";

type Target = "body" | "query" | "params";

/** Validates one part of the request with Zod and replaces it with the parsed value. */
export const validate =
  (target: Target, schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(new AppError("VALIDATION", "Invalid request", result.error.flatten()));
    }
    // req.query is a getter in Express 5, so redefine it instead of assigning
    Object.defineProperty(req, target, { value: result.data, writable: true, configurable: true });
    next();
  };
