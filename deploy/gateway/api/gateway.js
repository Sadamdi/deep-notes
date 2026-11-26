// Stable front door for the Deep Notes API (free, on Vercel).
//
// The real backend runs on a small server behind a Cloudflare quick tunnel whose address changes when it restarts.
// This function keeps ONE stable address: vercel.json rewrites every /api/* request here (the original path arrives in
// the `__p` query parameter), and the function forwards it to the current origin, which it reads from
// deploy/server-url.json in the public repository (updated by `node scripts/update-server-url.mjs`).
//
// Security notes (also in docs/ENVIRONMENTS.md): whoever can push to the repository's main branch can point this
// gateway at another server, and cookies and passwords pass through it. Only accounts the team trusts may push to main.
// The origin must be https and must not be a vercel.app address (no loops).
// Node.js runtime, not edge: an edge function must answer within 25 seconds, and generating a game session or a
// concept map with the model can take longer.
export const config = { maxDuration: 100 };

const SOURCE = "https://raw.githubusercontent.com/Sadamdi/deep-notes/main/deploy/server-url.json";
const HOP = new Set(["host", "connection", "keep-alive", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization", "proxy-authenticate", "content-length", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for", "x-real-ip", "x-vercel-id", "x-vercel-forwarded-for", "forwarded", "accept-encoding"]);
let cache = { url: null, at: 0 };

async function origin(force) {
  if (!force && cache.url && Date.now() - cache.at < 30_000) return cache.url;
  const res = await fetch(`${SOURCE}?t=${Math.floor(Date.now() / 30_000)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`server-url.json answered ${res.status}`);
  const { url } = await res.json();
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname.endsWith(".vercel.app") || u.pathname !== "/") throw new Error("invalid origin in server-url.json");
  cache = { url: u.origin, at: Date.now() };
  return cache.url;
}

function json(status, body) {
  return new Response(JSON.stringify({ success: false, error: body }), { status, headers: { "content-type": "application/json" } });
}

export async function handler(request) {
  const incoming = new URL(request.url);
  const p = incoming.searchParams.get("__p") ?? "";
  incoming.searchParams.delete("__p");
  const target = "/api/" + p.replace(/^\/+/, "") + (incoming.searchParams.size ? "?" + incoming.searchParams.toString() : "");

  const headers = new Headers();
  for (const [k, v] of request.headers) if (!HOP.has(k.toLowerCase())) headers.set(k, v);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  // a request body can be read once, so keep a copy to allow one retry after the origin address changed
  const body = hasBody ? await request.arrayBuffer() : undefined;

  for (const force of [false, true]) {
    let base;
    try {
      base = await origin(force);
    } catch (e) {
      return json(502, { code: "INTERNAL", message: "Gateway cannot find the server address: " + e.message });
    }
    try {
      const upstream = await fetch(base + target, { method: request.method, headers, body, redirect: "manual" });
      // an old tunnel address answers with 530 or 502 from Cloudflare: look up the address again once
      if (!force && (upstream.status === 530 || upstream.status === 502) && upstream.headers.get("server")?.toLowerCase().includes("cloudflare")) continue;
      // fetch has already decompressed the body, so the old encoding and length no longer describe it
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("content-length");
      return new Response(upstream.body, { status: upstream.status, headers: out });
    } catch {
      if (force) return json(502, { code: "INTERNAL", message: "The server is not reachable right now" });
    }
  }
  return json(502, { code: "INTERNAL", message: "The server is not reachable right now" });
}

export default { fetch: handler };
