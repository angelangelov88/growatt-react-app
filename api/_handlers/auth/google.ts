import { serializeCookieHeader } from "@supabase/ssr";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  AFTER_GOOGLE_COOKIE,
  AFTER_GOOGLE_PAGES,
} from "../../_lib/afterGoogle";
import { allowMethods, clientIp } from "../../_lib/http";
import { requestOrigin } from "../../_lib/origin";
import { countHit } from "../../_lib/rateLimit";
import { createSupabase, secure } from "../../_lib/session";

// GET → redirect to Google. The PKCE verifier is stored in an httpOnly cookie,
// so only this browser can finish the login in /api/auth/callback.
// ?next=settings comes back to that page instead of home (e.g. logging in again
// to add a password). Only names in AFTER_GOOGLE_PAGES count, so it can't send
// the user anywhere else.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  if ((await countHit("google", clientIp(req) ?? "unknown")) > 0) {
    res.redirect(302, "/login?error=rate_limited");
    return;
  }
  const { data, error } = await createSupabase(req, res).auth.signInWithOAuth({
    provider: "google",
    options: {
      // Back to the host this browser is on, where the PKCE cookie is.
      redirectTo: `${requestOrigin(req)}/api/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    res.redirect(302, "/login?error=google_unavailable");
    return;
  }
  const next = typeof req.query.next === "string" ? req.query.next : "";
  if (AFTER_GOOGLE_PAGES.has(next))
    res.appendHeader(
      "Set-Cookie",
      serializeCookieHeader(AFTER_GOOGLE_COOKIE, next, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 10 * 60,
      }),
    );
  res.redirect(302, data.url);
};

export default handler;
