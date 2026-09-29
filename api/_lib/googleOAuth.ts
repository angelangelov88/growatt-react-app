import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { GoogleLogin } from "../../src/types/Server";
import { requestOrigin } from "./origin";
import { secure } from "./session";

// Google sign-in runs through our own address, not Supabase's, so Google's
// account chooser names the app's domain. We do the OAuth steps with Google
// ourselves and hand the resulting ID token to Supabase (signInWithIdToken),
// which checks it and starts the session.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 10_000;
const COOKIE = "google_login";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/api/auth",
} as const;

// The pages a Google login may come back to, by the name /api/auth/google
// accepts in ?next=. Anything else lands on home.
const AFTER_GOOGLE_PAGES = new Map([["settings", "/settings"]]);

const randomToken = () => randomBytes(32).toString("base64url");
const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Read when needed, not at import: the auth router loads every handler, so a
// missing setting only breaks Google sign-in, not email login.
const googleClient = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return { id: GOOGLE_CLIENT_ID, secret: GOOGLE_CLIENT_SECRET };
};

// Must match one of the client's redirect URIs in Google Cloud exactly, so
// Google sign-in only works on the addresses listed there (not on previews).
// The same host as the request, where the cookie is.
const redirectUri = (req: VercelRequest) =>
  `${requestOrigin(req)}/api/auth/callback`;

const isGoogleLogin = (value: unknown): value is GoogleLogin =>
  typeof value === "object" &&
  value !== null &&
  "state" in value &&
  typeof value.state === "string" &&
  "verifier" in value &&
  typeof value.verifier === "string" &&
  "nonce" in value &&
  typeof value.nonce === "string" &&
  "next" in value &&
  typeof value.next === "string";

// Starts a login and returns Google's address. The state, PKCE verifier and
// nonce stay in an httpOnly cookie, so only this browser can finish it. Google
// gets the verifier's and nonce's hashes; Supabase later gets the nonce itself
// and checks its hash against the ID token.
const startGoogleLogin = (
  req: VercelRequest,
  res: VercelResponse,
  clientId: string,
  next: string,
) => {
  const login: GoogleLogin = {
    state: randomToken(),
    verifier: randomToken(),
    nonce: randomToken(),
    next: AFTER_GOOGLE_PAGES.has(next) ? next : "",
  };
  res.appendHeader(
    "Set-Cookie",
    serializeCookieHeader(
      COOKIE,
      Buffer.from(JSON.stringify(login)).toString("base64url"),
      { ...COOKIE_OPTIONS, maxAge: 10 * 60 },
    ),
  );
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state: login.state,
    code_challenge: sha256(login.verifier).toString("base64url"),
    code_challenge_method: "S256",
    nonce: sha256(login.nonce).toString("hex"),
  });
  return `${AUTH_URL}?${params.toString()}`;
};

// The login this browser started, if any, and only if Google sent back its
// state. The cookie is cleared whatever happens, so it's used once.
const takeGoogleLogin = (req: VercelRequest, res: VercelResponse) => {
  const value = parseCookieHeader(req.headers.cookie ?? "").find(
    (c) => c.name === COOKIE,
  )?.value;
  res.appendHeader(
    "Set-Cookie",
    serializeCookieHeader(COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 }),
  );
  const { state } = req.query;
  if (!value || typeof state !== "string") return null;
  try {
    const login: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString(),
    );
    if (!isGoogleLogin(login)) return null;
    return timingSafeEqual(sha256(state), sha256(login.state)) ? login : null;
  } catch {
    return null;
  }
};

// Swaps Google's code for an ID token. null if Google refused or didn't
// answer; only the status is logged, never Google's reply.
const exchangeGoogleCode = async (
  req: VercelRequest,
  client: { id: string; secret: string },
  code: string,
  verifier: string,
) => {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      body: new URLSearchParams({
        client_id: client.id,
        client_secret: client.secret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(req),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("google token exchange failed:", response.status);
      return null;
    }
    const body: unknown = await response.json();
    return typeof body === "object" &&
      body !== null &&
      "id_token" in body &&
      typeof body.id_token === "string"
      ? body.id_token
      : null;
  } catch (error) {
    console.error(
      "google token exchange failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return null;
  }
};

export {
  AFTER_GOOGLE_PAGES,
  exchangeGoogleCode,
  googleClient,
  startGoogleLogin,
  takeGoogleLogin,
};
