import crypto from "node:crypto";

/** scrypt with a per-user salt. Format: scrypt$N$salt$hash (base64url). */
export function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) =>
      err ? reject(err) : resolve(`scrypt$16384$${salt.toString("base64url")}$${key.toString("base64url")}`),
    ),
  );
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !n || !salt || !hash) return Promise.resolve(false);
  return new Promise((resolve) =>
    crypto.scrypt(password, Buffer.from(salt, "base64url"), 64, { N: Number(n), r: 8, p: 1 }, (err, key) => {
      const expected = Buffer.from(hash, "base64url");
      resolve(!err && key.length === expected.length && crypto.timingSafeEqual(key, expected));
    }),
  );
}
