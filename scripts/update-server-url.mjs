// Reads the current public (tunnel) URL from the demo server, checks it, and writes it into docs/ENVIRONMENTS.md.
// Run it whenever the tunnel was restarted, then commit and push so the frontend team sees the new address:
//
//   node scripts/update-server-url.mjs
//
// It also writes deploy/server-url.json, which the stable gateway (deploy/gateway) reads to find the server.
// Needs the deploy SSH key (same variables as scripts/deploy.sh): DEPLOY_HOST, DEPLOY_PORT, DEPLOY_KEY.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const host = process.env.DEPLOY_HOST;
if (!host) throw new Error("set DEPLOY_HOST, for example root@<server-ip> (the address is not kept in the public repository)");
const port = process.env.DEPLOY_PORT ?? "22232";
const key = process.env.DEPLOY_KEY ?? path.join(os.homedir(), ".ssh", "deepnotes_vps_ed25519");

const logs = execFileSync("ssh", ["-i", key, "-p", port, "-o", "BatchMode=yes", host, "for f in $(ls -t /root/.pm2/logs/deepnotes-tunnel* 2>/dev/null); do u=$(grep -o 'https://[a-z0-9-]*[.]trycloudflare[.]com' $f | tail -1); if [ -n \"$u\" ]; then echo $u; break; fi; done"], { encoding: "utf8" }).trim();
if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(logs)) throw new Error("could not read the tunnel URL from the server logs: " + logs);

const res = await fetch(`${logs}/api/v1/health`, { signal: AbortSignal.timeout(20_000) });
if (!res.ok) throw new Error(`the URL ${logs} answered ${res.status} on /api/v1/health`);

const file = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "docs", "ENVIRONMENTS.md");
const text = fs.readFileSync(file, "utf8");
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
const block = `<!-- server-url:start -->\n**${logs}**\n\nTerakhir diverifikasi: ${stamp} (\`GET /api/v1/health\` menjawab 200).\n<!-- server-url:end -->`;
const next = text.replace(/<!-- server-url:start -->[\s\S]*?<!-- server-url:end -->/, block);
if (next === text && !text.includes(logs)) throw new Error("markers not found in docs/ENVIRONMENTS.md");
fs.writeFileSync(file, next);
const jsonFile = path.join(path.dirname(file), "..", "deploy", "server-url.json");
fs.writeFileSync(jsonFile, JSON.stringify({ url: logs, updatedAt: new Date().toISOString() }, null, 2) + "\n");
console.info(`docs/ENVIRONMENTS.md now points at ${logs}`);
