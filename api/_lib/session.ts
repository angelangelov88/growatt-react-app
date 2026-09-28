import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { JwtPayload, SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SessionUser } from "../../src/types/Server";
import { sendError } from "./http";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, APP_ORIGIN } = process.env;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !APP_ORIGIN)
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and APP_ORIGIN must be set",
  );

// Secure cookies need HTTPS, which localhost doesn't have.
const secure = !APP_ORIGIN.startsWith("http://localhost");

// A Supabase client whose session lives in cookies on this request/response.
// Whatever Supabase asks for, the cookies are always httpOnly (scripts in the
// page can't read them), SameSite=Lax and, outside localhost, Secure.
const createSupabase = (req: VercelRequest, res: VercelResponse) =>
  createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(req.headers.cookie ?? ""),
      setAll: (cookies, headers) => {
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        cookies.forEach(({ name, value, options }) => {
          res.appendHeader(
            "Set-Cookie",
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure,
              sameSite: "lax",
              path: "/",
            }),
          );
        });
      },
    },
  });

// Whether the user still has to enter their authenticator app's code: they
// have an app, and this session hasn't passed it yet. An aal2 token (signed)
// proves the code was entered. Otherwise ask Supabase, because the user object
// in the session cookie is the browser's copy and could have its factors
// removed. null if Supabase couldn't answer.
const mfaPending = async (supabase: SupabaseClient, claims: JwtPayload) => {
  if (claims.aal === "aal2") return false;
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return null;
  return data.totp.length > 0;
};

// Call first in every endpoint that needs a login. Verifies the access token
// against Supabase's public key (refreshing it from the cookie if it expired).
// Users with MFA must have entered their app's code in this session (aal2),
// or they get 403 mfa_required; only the endpoints that let them enter it
// pass allowPendingMfa. Returns the user, or null after responding.
const requireUser = async (
  req: VercelRequest,
  res: VercelResponse,
  { allowPendingMfa = false } = {},
): Promise<SessionUser | null> => {
  res.setHeader("Cache-Control", "private, no-store");
  const supabase = createSupabase(req, res);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return null;
  }
  const { claims } = data;
  const pending = await mfaPending(supabase, claims);
  if (pending === null) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return null;
  }
  if (pending && !allowPendingMfa) {
    sendError(res, 403, "mfa_required", "Enter the code from your app");
    return null;
  }
  return { userId: claims.sub, claims, supabase };
};

export { createSupabase, requireUser };
