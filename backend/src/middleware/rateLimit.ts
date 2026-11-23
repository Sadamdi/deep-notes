import type { Request, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";

/** Small in-memory fixed-window limiter. Enough for one server process; replace with a shared store to scale out. */
export function rateLimit(opts: { windowMs: number; max: number; key: (req: Request) => string }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, _res, next) => {
    if (process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT) return next();
    const now = Date.now();
    const k = opts.key(req);
    const h = hits.get(k);
    if (!h || h.reset < now) {
      hits.set(k, { count: 1, reset: now + opts.windowMs });
      if (hits.size > 5000) for (const [kk, v] of hits) if (v.reset < now) hits.delete(kk);
      return next();
    }
    if (++h.count > opts.max) return next(new AppError("RATE_LIMITED", "Too many requests, try again later"));
    next();
  };
}
