import { loginSchema, registerSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { SESSION_COOKIE, cookieOptions, createSession, hashToken, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";

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
