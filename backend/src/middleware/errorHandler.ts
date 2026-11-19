import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { fail } from "../lib/apiResponse.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(fail("NOT_FOUND", "Route not found"));
};

/** Never leak stack traces: unknown errors become a generic INTERNAL response. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }
  req.log?.error({ err }, "unhandled error");
  res.status(500).json(fail("INTERNAL", "Something went wrong"));
};
