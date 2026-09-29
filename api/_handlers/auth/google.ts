import type { VercelRequest, VercelResponse } from "@vercel/node";
import { googleClient, startGoogleLogin } from "../../_lib/googleOAuth";
import { allowMethods, clientIp } from "../../_lib/http";
import { countHit } from "../../_lib/rateLimit";

// GET → redirect to Google, which comes back to /api/auth/callback.
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
  const client = googleClient();
  if (!client) {
    console.error("google sign-in isn't set up: GOOGLE_CLIENT_ID/SECRET");
    res.redirect(302, "/login?error=google_unavailable");
    return;
  }
  const next = typeof req.query.next === "string" ? req.query.next : "";
  res.redirect(302, startGoogleLogin(req, res, client.id, next));
};

export default handler;
