import type { VercelRequest, VercelResponse } from "@vercel/node";
import { auditSignIn } from "../../_lib/audit";
import { signupsOpen } from "../../_lib/db";
import {
  AFTER_GOOGLE_PAGES,
  exchangeGoogleCode,
  googleClient,
  takeGoogleLogin,
} from "../../_lib/googleOAuth";
import { allowMethods } from "../../_lib/http";
import { createSupabase } from "../../_lib/session";

// GET ?code=...&state=... after Google. Checks the state against the cookie
// /api/auth/google set, swaps the code (with the PKCE verifier) for Google's ID
// token, and gives that to Supabase, which verifies it and sets the session
// cookies. Lands on "/", or on the page /api/auth/google was asked to come back
// to (from an allow-list, never a URL from the query).
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  const login = takeGoogleLogin(req, res);
  const { code } = req.query;
  if (typeof code !== "string") {
    res.redirect(302, "/login?error=sign_in_cancelled");
    return;
  }
  const client = googleClient();
  if (!client) {
    res.redirect(302, "/login?error=google_unavailable");
    return;
  }
  if (!login) {
    res.redirect(302, "/login?error=sign_in_failed");
    return;
  }
  const token = await exchangeGoogleCode(req, client, code, login.verifier);
  if (!token) {
    res.redirect(302, "/login?error=sign_in_failed");
    return;
  }
  const { data, error } = await createSupabase(req, res).auth.signInWithIdToken(
    {
      provider: "google",
      token,
      nonce: login.nonce,
    },
  );
  if (error) {
    // A new Google account is refused by the database once the beta is full.
    if (!(await signupsOpen())) {
      res.redirect(302, "/login?error=signups_closed");
      return;
    }
    console.error("google sign-in failed:", error.code ?? error.name);
    res.redirect(302, "/login?error=sign_in_failed");
    return;
  }
  await auditSignIn(req, data.user.id, "google");
  res.redirect(302, AFTER_GOOGLE_PAGES.get(login.next) ?? "/");
};

export default handler;
