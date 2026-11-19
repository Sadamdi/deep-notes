import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Every route handler is wrapped so a rejected promise reaches the error handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
