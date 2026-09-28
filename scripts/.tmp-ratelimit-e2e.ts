import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../api/_lib/db";

const env = process.env;
const APP_ORIGIN = env.APP_ORIGIN ?? "";
const admin = createClient(env.SUPABASE_URL ?? "", env.SUPABASE_SECRET_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(ok ? "✅" : "❌", name, ok ? "" : extra);
};
const call = async (jar: Map<string, string>, method: string, path: string, body?: unknown, extra: Record<string, string> = {}) => {
  const res = await fetch(APP_ORIGIN + path, {
    method,
    redirect: "manual",
    headers: { Origin: APP_ORIGIN, "content-type": "application/json", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair = ""] = c.split(";");
    const i = pair.indexOf("=");
    const v = pair.slice(i + 1);
    if (v === "" || /Max-Age=0/i.test(c)) jar.delete(pair.slice(0, i));
    else jar.set(pair.slice(0, i), v);
  }
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text.slice(0, 80); }
  return { status: res.status, json, retryAfter: res.headers.get("retry-after"), location: res.headers.get("location") };
};
// Calls until something other than `expected` comes back. Returns how many
// `expected` answers there were, and the first different reply.
const until = async (expected: number, fn: () => ReturnType<typeof call>, cap = 80) => {
  for (let n = 0; n < cap; n++) {
    const r = await fn();
    if (r.status !== expected) return { n, r };
  }
  return { n: cap, r: null };
};
const makeUser = async () => {
  const email = `ratelimit-e2e-${randomBytes(4).toString("hex")}@example.com`;
  const password = `${randomBytes(18).toString("base64")}aA1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const jar = new Map<string, string>();
  const ip = { "x-real-ip": `198.51.100.${String(Math.floor(Math.random() * 250) + 1)}` };
  const r = await call(jar, "POST", "/api/auth/login", { email, password }, ip);
  if (r.status !== 204) throw new Error(`login ${String(r.status)}`);
  return { id: data.user.id, email, jar };
};

const main = async () => {
  const ids: string[] = [];
  try {
    // The server's role can only call the function, not touch the table.
    for (const [name, q] of [
      ["select", sql`select * from private.rate_limits limit 1`],
      ["delete", sql`delete from private.rate_limits`],
      ["insert", sql`insert into private.rate_limits values ('x', now(), 0)`],
    ] as const) {
      const err = await q.then(() => null, (e: unknown) => e as Error);
      check(`app_server can't ${name} rate_limits`, !!err && /permission denied/.test(err.message), String(err));
    }
    const bad = await sql`select private.rate_limit_hit('x', 0, 60)`.then(() => null, (e: unknown) => e as Error);
    check("function rejects a nonsense limit", !!bad && /invalid rate limit/.test(bad.message), String(bad));
    const key = `e2e:${randomBytes(8).toString("hex")}`;
    const hit = async () => (await sql<{ w: number }[]>`select private.rate_limit_hit(${key}, 2, 2) as w`)[0].w;
    const seq = [await hit(), await hit(), await hit()];
    await new Promise((r) => setTimeout(r, 2100));
    seq.push(await hit());
    check("window: 2 allowed, 3rd waits, resets after the window", seq[0] === 0 && seq[1] === 0 && seq[2] > 0 && seq[2] <= 2 && seq[3] === 0, JSON.stringify(seq));

    const a = await makeUser();
    const b = await makeUser();
    ids.push(a.id, b.id);

    // Growatt writes: invalid bodies are cheap and never reach Growatt, but still count.
    let x = await until(400, () => call(a.jar, "PUT", "/api/growatt/charge", {}));
    check(`Growatt writes: 50 allowed, then 429 (got ${String(x.n)})`, x.n === 50 && x.r?.status === 429 && x.r.json.code === "rate_limited", JSON.stringify(x.r));
    const wait = Number(x.r?.retryAfter);
    check(`Retry-After is set (${String(wait)}s)`, wait > 500 && wait <= 600);
    x = await until(409, () => call(a.jar, "GET", "/api/growatt/charge"));
    check(`Growatt reads counted separately: 60 allowed, then 429 (got ${String(x.n)})`, x.n === 60 && x.r?.status === 429, JSON.stringify(x.r));
    check("discharge shares the read limit", (await call(a.jar, "GET", "/api/growatt/discharge")).status === 429);
    check("another user isn't affected", (await call(b.jar, "GET", "/api/growatt/charge")).status === 409);

    x = await until(409, () => call(a.jar, "GET", "/api/octopus/slots"));
    check(`Octopus reads: 60 allowed, then 429 (got ${String(x.n)})`, x.n === 60 && x.r?.status === 429, JSON.stringify(x.r));

    x = await until(400, () => call(a.jar, "POST", "/api/auth/mfa", { action: "verify", code: "000000" }));
    check(`MFA: 10 allowed, then 429 (got ${String(x.n)})`, x.n === 10 && x.r?.status === 429, JSON.stringify(x.r));

    // Login by IP, using made-up addresses (vercel dev passes x-real-ip through;
    // on Vercel the caller can't set it).
    const ip1 = { "x-real-ip": "203.0.113.10" };
    const ip2 = { "x-real-ip": "203.0.113.20" };
    const wrong = { email: a.email, password: "wrong-password" };
    x = await until(401, () => call(new Map(), "POST", "/api/auth/login", wrong, ip1));
    check(`login: 20 per IP, then 429 (got ${String(x.n)})`, x.n === 20 && x.r?.status === 429, JSON.stringify(x.r));
    check("another IP can still log in", (await call(new Map(), "POST", "/api/auth/login", wrong, ip2)).status === 401);
    x = await until(302, async () => {
      const r = await call(new Map(), "GET", "/api/auth/google", undefined, ip1);
      return r.location === "/login?error=rate_limited" ? { ...r, status: 429 } : r;
    });
    check(`Google start: 20 per IP, then redirect to /login?error=rate_limited (got ${String(x.n)})`, x.n === 20 && x.r?.status === 429, JSON.stringify(x.r));
  } finally {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    await sql.end();
  }
  console.log(failures === 0 ? "\nAll checks passed" : `\n${String(failures)} failed`);
};
void main();
