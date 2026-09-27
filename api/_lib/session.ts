import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
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

// Call first in every endpoint that needs a login. Verifies the access token
// against Supabase's public key (refreshing it from the cookie if it expired).
// Returns the user, or null after responding 401.
const requireUser = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<SessionUser | null> => {
  res.setHeader("Cache-Control", "private, no-store");
  const supabase = createSupabase(req, res);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return null;
  }
  return { userId: data.claims.sub, claims: data.claims, supabase };
};

export { createSupabase, requireUser };
