import { Router } from "express";
import { buildOpenApi } from "./openapi.js";

/** Public API documentation: the OpenAPI document and a Swagger UI page. Mounted in app.ts at /api/docs. */
export const docsRoutes = Router();

const spec = buildOpenApi();
docsRoutes.get("/openapi.json", (_req, res) => {
  res.json(spec);
});

const PAGE = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deep Notes API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css">
</head><body>
<div id="ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>window.ui = SwaggerUIBundle({ url: "/api/docs/openapi.json", dom_id: "#ui", deepLinking: true, persistAuthorization: true });</script>
</body></html>`;

docsRoutes.get("/", (_req, res) => {
  // the global helmet policy blocks the CDN assets Swagger UI needs, so this page gets its own narrow policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; connect-src 'self'",
  );
  res.type("html").send(PAGE);
});
