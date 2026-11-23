import crypto from "node:crypto";
import type { NotebookRole } from "@deep-notes/shared";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { getDb } from "../db/index.js";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "./asyncHandler.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      member?: { notebookId: string; role: NotebookRole };
    }
  }
}

export const SESSION_COOKIE = "dn_session";
const SESSION_DAYS = 14;

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.query("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1,$2,$3)", [hashToken(token), userId, expiresAt]);
  return { token, expiresAt };
}

export const cookieOptions = (expires?: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  ...(expires ? { expires } : {}),
});

/** Reads the session cookie and attaches req.user when it is valid. Never rejects by itself. */
export const attachUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) {
    const db = await getDb();
    const rows = await db.query<AuthUser>(
      `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    );
    if (rows[0]) req.user = rows[0];
  }
  next();
});

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AppError("UNAUTHORIZED", "Sign in first"));
  next();
};

const RANK: Record<NotebookRole, number> = { viewer: 1, editor: 2, owner: 3 };

/**
 * Loads the caller's membership for :id (the notebook). A non-member gets NOT_FOUND, not FORBIDDEN,
 * so the existence of other groups' notebooks is never revealed.
 */
export const notebookAccess = (min: NotebookRole = "viewer", param = "id"): RequestHandler =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError("UNAUTHORIZED", "Sign in first");
    const notebookId = String(req.params[param]);
    if (!/^[0-9a-f-]{36}$/i.test(notebookId)) throw new AppError("NOT_FOUND", "Notebook not found");
    const db = await getDb();
    const rows = await db.query<{ role: NotebookRole }>(
      "SELECT role FROM notebook_members WHERE notebook_id = $1 AND user_id = $2",
      [notebookId, req.user.id],
    );
    const role = rows[0]?.role;
    if (!role) throw new AppError("NOT_FOUND", "Notebook not found");
    if (RANK[role] < RANK[min]) throw new AppError("FORBIDDEN", "Your role cannot do this");
    req.member = { notebookId, role };
    next();
  });
