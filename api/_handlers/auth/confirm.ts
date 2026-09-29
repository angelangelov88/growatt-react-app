import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { EmailOtpType } from "@supabase/supabase-js";
import { auditSignIn } from "../../_lib/audit";
import { allowMethods } from "../../_lib/http";
import { createSupabase } from "../../_lib/session";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

// GET ?token_hash=...&type=... from the links in Supabase's emails. Works on
// any device, unlike a PKCE code. Signs the user in and goes to the app.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  const { token_hash: tokenHash, type } = req.query;
  const otpType = TYPES.find((t) => t === type);
  if (typeof tokenHash !== "string" || !otpType) {
    res.redirect(302, "/login?error=invalid_link");
    return;
  }
  const { data, error } = await createSupabase(req, res).auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  });
  if (error) {
    res.redirect(302, "/login?error=link_expired");
    return;
  }
  if (data.user) await auditSignIn(req, data.user.id, "email_link");
  res.redirect(302, otpType === "recovery" ? "/reset-password" : "/");
};

export default handler;
