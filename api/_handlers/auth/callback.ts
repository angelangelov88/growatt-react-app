import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  AFTER_GOOGLE_COOKIE,
  AFTER_GOOGLE_PAGES,
} from "../../_lib/afterGoogle";
import { allowMethods } from "../../_lib/http";
import { createSupabase, secure } from "../../_lib/session";

// GET ?code=... after Google. Swaps the code (plus the PKCE verifier cookie)
// for a session. Lands on "/", or on the page /api/auth/google was asked to
// come back to (from an allow-list, never a URL from the query).
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  // Read once, then cleared whatever happens.
  const next = parseCookieHeader(req.headers.cookie ?? "").find(
    (c) => c.name === AFTER_GOOGLE_COOKIE,
  )?.value;
  res.appendHeader(
    "Set-Cookie",
    serializeCookieHeader(AFTER_GOOGLE_COOKIE, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    }),
  );
  const { code } = req.query;
  if (typeof code !== "string") {
    res.redirect(302, "/login?error=sign_in_cancelled");
    return;
  }
  const { error } = await createSupabase(req, res).auth.exchangeCodeForSession(
    code,
  );
  if (error) {
    res.redirect(302, "/login?error=sign_in_failed");
    return;
  }
  res.redirect(302, (next && AFTER_GOOGLE_PAGES.get(next)) ?? "/");
};

export default handler;
