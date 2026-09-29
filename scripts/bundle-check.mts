// Fails if the built app (dist/) holds a secret or server-only code. Vercel
// serves everything in dist/ to anyone, so nothing secret may end up there.
// Prints file names and what was found, never the matching text.
// Run after pnpm build: pnpm check:bundle (CI runs it too).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const DIST = "dist";

const PATTERNS: [RegExp, string][] = [
  [/sb_secret_/, "a Supabase secret key"],
  [/sb_publishable_/, "a Supabase key (the browser never talks to Supabase)"],
  [/service_role/, "a Supabase service role reference"],
  [/eyJ[\w-]{10,}\.eyJ[\w-]{10,}/, "a JWT"],
  [/\b(?:sk|rk)_(?:live|test)_\w{8,}/, "an API secret key"],
  [/postgres(?:ql)?:\/\//, "a database address"],
  [/GOCSPX-/, "a Google client secret"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{8,}/, "a Resend API key"],
  [
    /\b(?:SUPABASE|DATABASE|CREDENTIALS|CRON|GOOGLE|GROWATT|OCTOPUS|GITHUB|RESEND)_[A-Z0-9_]+/,
    "a server setting's name",
  ],
  [/\bVITE_\w+/, "a VITE_ setting (built into the bundle)"],
  [/tcpSet\.do/, "the Growatt client (server only)"],
  [/obtainKrakenToken/, "the Octopus login (server only)"],
  [/@supabase\/|auth\/v1\//, "Supabase client code (server only)"],
];

// Values from .env (locally) and any secret passed in the environment (CI).
// Short values (a port, "true") would match by chance, so they're skipped.
const SECRET_NAMES = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
  "CREDENTIALS_ENC_KEY_V1",
  "CRON_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
];
const envValues = new Map<string, string>();
const remember = (name: string, value: string | undefined) => {
  if (value && value.length >= 12) envValues.set(name, value);
};
if (existsSync(".env"))
  for (const [name, value] of Object.entries(
    parseEnv(readFileSync(".env", "utf8")),
  ))
    remember(name, value);
for (const name of SECRET_NAMES) remember(name, process.env[name]);

if (!existsSync(DIST)) throw new Error("Run pnpm build first");
const files = readdirSync(DIST, { recursive: true, encoding: "utf8" })
  .map((file) => join(DIST, file))
  .filter((file) => statSync(file).isFile());

let failures = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const found = [
    ...PATTERNS.filter(([pattern]) => pattern.test(text)).map(
      ([, what]) => what,
    ),
    ...[...envValues]
      .filter(([, value]) => text.includes(value))
      .map(([name]) => `the value of ${name}`),
  ];
  for (const what of found) {
    failures++;
    console.log("❌", `${file}: ${what}`);
  }
}

console.log(
  failures === 0
    ? `✅ ${String(files.length)} files in ${DIST}/, no secrets or server code (checked ${String(envValues.size)} secret values)`
    : `\n${String(failures)} problems in ${DIST}/`,
);
process.exitCode = failures === 0 ? 0 : 1;
