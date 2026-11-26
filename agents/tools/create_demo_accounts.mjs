// Creates 4 demo accounts plus one shared workspace with sample material, through the public API.
// Meant to be run by a person: the passwords are generated on this machine, shown in this terminal and
// saved to docs/local/ (gitignored). Run from the repo root:
//
//   node agents/tools/create_demo_accounts.mjs [--base https://deepnotes-app.vercel.app] [--out <file>]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "https://deepnotes-app.vercel.app").replace(/\/$/, "");
const out = arg("out", "docs/local/DEMO_SERVER_ACCOUNTS.local.md");
const run = crypto.randomBytes(2).toString("hex");

function client() {
  let cookie = "";
  return async (method, route, body) => {
    const res = await fetch(`${base}/api/v1${route}`, { method, headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${json?.error?.message ?? ""}`);
    return json.data;
  };
}

const users = [];
fs.mkdirSync(path.dirname(out), { recursive: true });
for (const [i, name] of ["Demo Satu", "Demo Dua", "Demo Tiga", "Demo Empat"].entries()) {
  const email = `demo${i + 1}.${run}@example.com`;
  const password = crypto.randomBytes(9).toString("base64url");
  const call = client();
  await call("POST", "/auth/register", { email, name, password });
  // saved right away, so a later failure never leaves an account without a recorded password
  fs.appendFileSync(out, `${email} | ${password}\n`);
  users.push({ call, email, password });
}

const [owner, ...others] = users;
const notebook = await owner.call("POST", "/notebooks", { title: "Jaringan Komputer (demo)", course: "Jaringan Komputer" });
const material = fs.readFileSync("backend/eval/demo-material.md", "utf8").replace(/=== Halaman \d+ ===/g, "").trim();
await owner.call("POST", `/notebooks/${notebook.id}/sources/text`, { title: "Catatan Jaringan Komputer (sintetis)", text: material });
const invite = await owner.call("POST", `/notebooks/${notebook.id}/invites`, {});
for (const user of others) await user.call("POST", `/invites/${invite.token}/accept`);

console.info(`\nSelesai. Masuk di ${base}/login\n`);
for (const user of users) console.info(`${user.email}   ${user.password}`);
console.info(`\nDisimpan juga di ${out} (tidak ikut git).`);
