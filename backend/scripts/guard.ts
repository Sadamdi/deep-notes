/** Shared safety checks for scripts that write to the database. */

export function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Destructive scripts must refuse to run unless the database is on this machine. */
export function assertLocalDatabase(url: string | undefined): void {
  const host = databaseHost(url);
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error(`Refusing to run: DATABASE_URL host is "${host ?? "missing"}", not localhost.`);
  }
}
