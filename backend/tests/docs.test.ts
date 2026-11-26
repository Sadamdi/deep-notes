import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { ENDPOINTS } from "../src/docs/endpoints.js";
import { closeApp, freshApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

const UUID = "00000000-0000-0000-0000-000000000001";
const fill = (p: string) => p.replace(/:decision/, "approve").replace(/:page/, "1").replace(/:(\w+)/g, UUID).replace(/\/invites\/[^/]+\/accept/, `/invites/abc/accept`);

describe("OpenAPI document", () => {
  it("serves a valid-looking OpenAPI 3 document with every registered operation and typed request bodies", async () => {
    const r = await request(app).get("/api/docs/openapi.json");
    expect(r.status).toBe(200);
    expect(r.body.openapi).toBe("3.0.3");
    const ops = Object.values(r.body.paths).flatMap((p) => Object.keys(p as object));
    expect(ops.length).toBe(ENDPOINTS.length);
    const login = r.body.paths["/auth/login"].post;
    expect(login.requestBody.content["application/json"].schema.properties).toHaveProperty("password");
    expect(r.body.paths["/notebooks/{id}/sources/file"].post.requestBody.content).toHaveProperty("multipart/form-data");
    expect(r.body.paths["/notebooks/{id}/ai/assist"].post.requestBody.content["application/json"].schema.oneOf).toHaveLength(2);
    expect(r.body.paths["/notebooks/{id}/companion/explain"].post.responses["200"].content["application/json"].schema.properties.data.properties).toHaveProperty("beats");
  });

  it("serves the Swagger UI page with its own narrow CSP", async () => {
    const r = await request(app).get("/api/docs");
    expect(r.status).toBe(200);
    expect(r.text).toContain("SwaggerUIBundle");
    expect(r.headers["content-security-policy"]).toContain("unpkg.com");
    expect((await request(app).get("/api/v1/health")).headers["content-security-policy"]).not.toContain("unpkg.com");
  });

  it("documents only routes that really exist (no drift): none of them answers 'Route not found'", async () => {
    for (const e of ENDPOINTS) {
      const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[e.method]!(`/api/v1${fill(e.path)}`);
      const missing = res.status === 404 && res.body?.error?.message === "Route not found";
      expect(missing, `${e.method.toUpperCase()} ${e.path} is documented but not served`).toBe(false);
    }
  });
});
