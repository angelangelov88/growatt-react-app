// Checks the session cookies and Origin check against the real Supabase project.
// Signs in a throwaway user, then tries missing, tampered, expired and
// cross-site requests. Run: pnpm dlx tsx --env-file=.env scripts/session-check.ts
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSupabase, requireUser } from "../api/_lib/session";
import { checkOrigin } from "../api/_lib/csrf";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, APP_ORIGIN } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !APP_ORIGIN)
  throw new Error(
    "SUPABASE_URL, SUPABASE_SECRET_KEY and APP_ORIGIN must be set",
  );

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failures++;
  console.log(ok ? "✅" : "❌", name);
};

// Just enough of Vercel's request/response for the helpers.
const fakeRequest = (
  cookies: Map<string, string>,
  method = "GET",
  origin?: string,
) =>
  ({
    method,
    headers: {
      cookie: [...cookies]
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; "),
      ...(origin ? { origin } : {}),
    },
  }) as unknown as VercelRequest;

const fakeResponse = () => {
  const state = { status: 200, setCookies: [] as string[] };
  const res = {
    status: (code: number) => {
      state.status = code;
      return res;
    },
    json: () => res,
    setHeader: () => res,
    appendHeader: (_: string, value: string) => {
      state.setCookies.push(value);
      return res;
    },
  };
  return { res: res as unknown as VercelResponse, state };
};

// Updates a cookie jar from Set-Cookie headers, like a browser would.
const applySetCookies = (jar: Map<string, string>, setCookies: string[]) => {
  setCookies.forEach((header) => {
    const [pair] = header.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index);
    const value = decodeURIComponent(pair.slice(index + 1));
    if (value === "" || /Max-Age=0/i.test(header)) jar.delete(name);
    else jar.set(name, value);
  });
};

// Reads and rewrites the session stored in the (possibly chunked) cookie.
const editSession = (
  jar: Map<string, string>,
  edit: (session: Record<string, unknown>) => void,
) => {
  const names = [...jar.keys()].filter((n) => n.startsWith("sb-")).sort();
  const base = names[0].replace(/\.\d+$/, "");
  const raw = names.map((n) => jar.get(n)).join("");
  const session = JSON.parse(
    Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  edit(session);
  const copy = new Map(jar);
  names.forEach((n) => copy.delete(n));
  copy.set(
    base,
    `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
  );
  return copy;
};

const main = async () => {
  const email = `session-check-${randomBytes(4).toString("hex")}@example.com`;
  const password = `${randomBytes(24).toString("base64")}aA1!`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = created.user.id;

  try {
    // No cookie.
    {
      const { res, state } = fakeResponse();
      const user = await requireUser(fakeRequest(new Map()), res);
      check("no cookie → 401", user === null && state.status === 401);
    }

    // Sign in through the cookie client, as the login endpoint will.
    const jar = new Map<string, string>();
    {
      const { res, state } = fakeResponse();
      const { error: signInError } = await createSupabase(
        fakeRequest(jar),
        res,
      ).auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      applySetCookies(jar, state.setCookies);
      const header = state.setCookies.join("\n");
      check("session cookies are set", jar.size > 0);
      check(
        "cookies are HttpOnly",
        state.setCookies.every((c) => /HttpOnly/i.test(c)),
      );
      check(
        "cookies are SameSite=Lax",
        state.setCookies.every((c) => /SameSite=Lax/i.test(c)),
      );
      check(
        "cookies are Path=/",
        state.setCookies.every((c) => /Path=\//i.test(c)),
      );
      check(
        "no token appears unencoded in the header",
        !header.includes('"access_token"'),
      );
    }

    // A valid cookie.
    {
      const { res, state } = fakeResponse();
      const user = await requireUser(fakeRequest(jar), res);
      check(
        "valid cookie → the right user",
        user?.userId === userId && state.status === 200,
      );
    }

    // A forged token: same claims, broken signature.
    {
      const forged = editSession(jar, (s) => {
        const token = s.access_token as string;
        s.access_token = `${token.slice(0, -4)}AAAA`;
      });
      const { res, state } = fakeResponse();
      const user = await requireUser(fakeRequest(forged), res);
      check("forged token → 401", user === null && state.status === 401);
    }

    // An expired access token is refreshed from the refresh token.
    {
      const expired = editSession(jar, (s) => {
        s.expires_at = Math.floor(Date.now() / 1000) - 60;
      });
      const { res, state } = fakeResponse();
      const user = await requireUser(fakeRequest(expired), res);
      check(
        "expired token → refreshed, same user, new cookies",
        user?.userId === userId && state.setCookies.length > 0,
      );
    }

    // After the user is signed out everywhere, the refresh token stops working.
    {
      await admin.auth.admin.signOut(
        (
          JSON.parse(
            Buffer.from(
              [...jar.entries()]
                .filter(([n]) => n.startsWith("sb-"))
                .sort()
                .map(([, v]) => v)
                .join("")
                .replace(/^base64-/, ""),
              "base64url",
            ).toString("utf8"),
          ) as { access_token: string }
        ).access_token,
        "global",
      );
      const expired = editSession(jar, (s) => {
        s.expires_at = Math.floor(Date.now() / 1000) - 60;
      });
      const { res, state } = fakeResponse();
      const user = await requireUser(fakeRequest(expired), res);
      check(
        "revoked session can't refresh → 401",
        user === null && state.status === 401,
      );
    }
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }

  // Origin check for writes.
  const originCase = (method: string, origin?: string) => {
    const { res } = fakeResponse();
    return checkOrigin(fakeRequest(new Map(), method, origin), res);
  };
  check("GET without Origin is allowed", originCase("GET"));
  check("POST from our origin is allowed", originCase("POST", APP_ORIGIN));
  check(
    "POST from another site → 403",
    !originCase("POST", "https://evil.example"),
  );
  check("POST without Origin → 403", !originCase("POST"));
  check(
    "DELETE from another site → 403",
    !originCase("DELETE", "https://evil.example"),
  );

  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${String(failures)} failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
};

void main();
