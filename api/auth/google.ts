import type { VercelRequest, VercelResponse } from "@vercel/node";
import { allowMethods } from "../_lib/http";
import { createSupabase } from "../_lib/session";

// GET → redirect to Google. The PKCE verifier is stored in an httpOnly cookie,
// so only this browser can finish the login in /api/auth/callback.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  const { data, error } = await createSupabase(req, res).auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.APP_ORIGIN ?? ""}/api/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    res.redirect(302, "/login?error=google_unavailable");
    return;
  }
  res.redirect(302, data.url);
};

export default handler;
