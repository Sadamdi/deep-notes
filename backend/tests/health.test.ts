import request from "supertest";
import { describe, expect, it } from "vitest";
import { healthSchema } from "@deep-notes/shared";
import { createApp } from "../src/app.js";

describe("GET /api/v1/health", () => {
  it("returns the success envelope with a valid health payload", async () => {
    const res = await request(createApp()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(healthSchema.safeParse(res.body.data).success).toBe(true);
  });

  it("returns the error envelope for unknown routes", async () => {
    const res = await request(createApp()).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });
});
