import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { getDb } from "./db/index.js";
import { cleanupExpired } from "./lib/maintenance.js";

const server = createApp().listen(env.PORT, () => {
  console.info(`deep-notes api listening on :${env.PORT}`);
});

// housekeeping: expired sessions and invites, once at start and every 6 hours
void cleanupExpired().catch((e) => console.error("cleanup failed", e));
setInterval(() => void cleanupExpired().catch((e) => console.error("cleanup failed", e)), 6 * 3600_000).unref();

function shutdown(signal: string) {
  console.info(`${signal} received, shutting down`);
  server.close(() => {
    void getDb()
      .then((db) => db.close())
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
