import type { VercelRequest, VercelResponse } from "@vercel/node";
import { allowMethods, clientIp } from "../../_lib/http";
import { countHit } from "../../_lib/rateLimit";
import { createSupabase } from "../../_lib/session";

// GET → redirect to Google. The PKCE verifier is stored in an httpOnly cookie,
// so only this browser can finish the login in /api/auth/callback.
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
