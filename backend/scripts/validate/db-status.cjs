// Read-only: runs `prisma migrate status` against a candidate URL taken from a line of ../.env.
// Usage: node scripts/validate/db-status.cjs <lineNumber>
// Never prints the URL credentials.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const line = Number(process.argv[2]);
const raw = fs.readFileSync(path.join(__dirname, "../../../.env"), "utf8").split(/\r?\n/)[line - 1] || "";
const url = raw.replace(/^\s*#?\s*(DATABASE_URL\s*=)?\s*/, "").replace(/^["']|["']\s*$/g, "").trim();
const u = new URL(url);
console.log(`candidate: ${u.protocol}//***@${u.host}${u.pathname}${u.search}`);

const res = spawnSync(process.execPath, [path.join(__dirname, "../../node_modules/prisma/build/index.js"), "migrate", "status"], {
  cwd: path.join(__dirname, "../.."),
  env: { ...process.env, DATABASE_URL: url },
  encoding: "utf8",
});
const mask = (s) => s.split(u.password).join("***").split(u.username).join("***");
console.log(mask(res.stdout || ""));
console.log(mask(res.stderr || ""));
process.exit(res.status ?? 1);
