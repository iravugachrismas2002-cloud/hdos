// Runs a command with the repo-root .env loaded and DATABASE_URL taken from a chosen .env line.
// Usage: node scripts/validate/run.cjs <envLine> -- <command> [args...]
// Credentials are masked in all output.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "../../..");
const argv = process.argv.slice(2);
const line = Number(argv[0]);
const cmd = argv.slice(argv.indexOf("--") + 1);

const lines = fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/);
const dbUrl = lines[line - 1].replace(/^\s*#?\s*(DATABASE_URL\s*=)?\s*/, "").replace(/^["']|["']\s*$/g, "").trim();
const parsed = require("dotenv").parse(lines.filter((l) => /^[A-Z_]+=/.test(l)).join("\n"));
const u = new URL(dbUrl);

const env = { ...process.env, ...parsed, DATABASE_URL: dbUrl, NODE_ENV: parsed.NODE_ENV || "development" };
const secrets = [u.password, u.username, parsed.GEMINI_API_KEY, parsed.JWT_SECRET].filter((s) => s && s.length > 3);
const mask = (s) => secrets.reduce((acc, x) => acc.split(x).join("***"), s);

const child = spawn(cmd[0], cmd.slice(1), { cwd: path.join(__dirname, "../.."), env, shell: true });
child.stdout.on("data", (d) => process.stdout.write(mask(d.toString())));
child.stderr.on("data", (d) => process.stderr.write(mask(d.toString())));
child.on("exit", (c) => process.exit(c ?? 1));
