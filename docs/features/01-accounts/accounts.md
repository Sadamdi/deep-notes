# F-01 Accounts and sessions

Status: implemented and tested (`backend/tests/core.test.ts`).

Endpoints (prefix `/api/v1`): `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /me/profile`.

Business rules
- BR-01 Email is lower-cased and unique. Name 2 to 80 characters, password 8 to 128.
- BR-02 Passwords are stored as salted scrypt hashes (`scrypt$N$salt$hash`). Note: the plan said argon2id; scrypt from Node's built-in crypto was chosen to avoid a native dependency on the small shared server. It is a memory-hard KDF with the same purpose.
- BR-03 A session is a random 256-bit token in an `httpOnly`, `sameSite=lax` cookie (`secure` in production). Only the SHA-256 of the token is stored. Sessions last 14 days and are deleted on logout.
- BR-04 Wrong email and wrong password return the same error, so accounts cannot be enumerated.
- BR-05 Register and login are limited to 20 attempts per 15 minutes per address and email.
- BR-06 Responses never contain the password hash.
