import { loginSchema, passwordResetConfirmSchema, passwordResetRequestSchema, registerSchema } from "@deep-notes/shared";
import crypto from "node:crypto";
import pino from "pino";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { SESSION_COOKIE, cookieOptions, createSession, hashToken, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { sendPasswordReset } from "../../lib/mail.js";

const recoveryLogger = pino({ name: "password-recovery" });

export const authRoutes = Router();

const limiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: (req) => `${req.ip}:${String(req.body?.email ?? "")}` });
const publicUser = (u: { id: string; email: string; name: string; course?: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  course: u.course ?? null,
});

authRoutes.post(
  "/register",
  limiter,
  validate("body", registerSchema),
  asyncHandler(async (req, res) => {
    const { email, name, password, course } = req.body as { email: string; name: string; password: string; course?: string };
    const db = await getDb();
    const exists = await db.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (exists.length) throw new AppError("CONFLICT", "Email is already registered");
    const rows = await db.query(
      "INSERT INTO users(email, name, password_hash, course) VALUES ($1,$2,$3,$4) RETURNING id, email, name, course",
      [email, name, await hashPassword(password), course ?? null],
    );
    const { token, expiresAt } = await createSession(rows[0]!.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt)).status(201).json(ok(publicUser(rows[0]!)));
  }),
);

authRoutes.post(
  "/login",
  limiter,
  validate("body", loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const db = await getDb();
    const rows = await db.query("SELECT id, email, name, course, password_hash FROM users WHERE email = $1", [email]);
    const user = rows[0];
    // same error for unknown email and wrong password so accounts cannot be enumerated
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new AppError("UNAUTHORIZED", "Email or password is incorrect");
    }
    const { token, expiresAt } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt)).json(ok(publicUser(user)));
  }),
);

const resetLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5, key: (req) => `${req.ip}:${String(req.body?.email ?? "")}` });
const genericResetResponse = { requested: true, message: "If the address is registered, a password reset link will be sent." };

authRoutes.post(
  "/password-reset/request",
  resetLimiter,
  validate("body", passwordResetRequestSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const db = await getDb();
    const user = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    if (user[0]) {
      const token = crypto.randomBytes(32).toString("base64url");
      await db.query("UPDATE password_reset_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL", [user[0].id]);
      await db.query("INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '30 minutes')", [user[0].id, hashToken(token)]);
      try {
        await sendPasswordReset(email, token);
      } catch (error) {
        recoveryLogger.error({ err: error }, "Password reset email delivery failed");
      }
    }
    res.status(202).json(ok(genericResetResponse));
  }),
);

authRoutes.post(
  "/password-reset/confirm",
  resetLimiter,
  validate("body", passwordResetConfirmSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    const passwordHash = await hashPassword(newPassword);
    const db = await getDb();
    const changed = await db.query<{ id: string }>(
      `WITH consumed AS (
         UPDATE password_reset_tokens SET consumed_at = now()
         WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING user_id
       ), updated AS (
         UPDATE users SET password_hash = $2 WHERE id IN (SELECT user_id FROM consumed) RETURNING id
       ), revoked AS (
         DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated) RETURNING user_id
       )
       SELECT id FROM updated`,
      [hashToken(token), passwordHash],
    );
    if (!changed[0]) throw new AppError("VALIDATION", "This password reset link is invalid or expired");
    res.clearCookie(SESSION_COOKIE, cookieOptions()).json(ok({ changed: true }));
  }),
);

authRoutes.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await (await getDb()).query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    res.clearCookie(SESSION_COOKIE, cookieOptions()).json(ok({ loggedOut: true }));
  }),
);

authRoutes.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query("SELECT id, email, name, course, looking_for_partners FROM users WHERE id = $1", [req.user!.id]);
    res.json(ok({ ...publicUser(rows[0]!), lookingForPartners: rows[0]!.looking_for_partners }));
  }),
);
