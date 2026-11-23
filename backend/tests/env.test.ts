import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("applies safe defaults", () => {
    const env = loadEnv({});
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_SSL).toBe("disable");
    expect(env.AI_PROVIDER_ORDER).toEqual(["gemini", "openai-compat"]);
    expect(env.GEMINI_API_KEYS).toEqual([]);
    expect(env.AI_EMBED_MODEL).toBe("gemini-embedding-001");
    expect(env.AI_EMBED_DIMENSIONS).toBe(768);
  });

  it("splits comma-separated lists and trims blanks", () => {
    const env = loadEnv({ GEMINI_API_KEYS: " k1 , k2,, " });
    expect(env.GEMINI_API_KEYS).toEqual(["k1", "k2"]);
  });

  it("rejects a malformed database URL and a short session secret", () => {
    expect(() => loadEnv({ DATABASE_URL: "not-a-url" })).toThrow();
    expect(() => loadEnv({ SESSION_SECRET: "short" })).toThrow();
  });
});
