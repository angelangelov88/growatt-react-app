import type { VercelRequest, VercelResponse } from "@vercel/node";
import { signupSchema } from "../../../src/lib/authSchemas";
import { checkOrigin } from "../../_lib/csrf";
import { signupsOpen } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { limitByIp } from "../../_lib/rateLimit";
import { createSupabase } from "../../_lib/session";

const FULL = "Kelpwatt's beta is full for now. Try again later";

// POST { email, password } → 202. Always the same answer, whether or not the
// email is already registered, so it can't be used to find accounts. 403 for
// everyone once the beta is full.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  const body = signupSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  if (!(await limitByIp(req, res, "signup"))) return;
  if (!(await signupsOpen())) {
    sendError(res, 403, "signups_closed", FULL);
    return;
  }
  // The confirmation email links to /api/auth/confirm (set in Supabase's templates).
  const { error } = await createSupabase(req, res).auth.signUp(body.data);
  if (error?.code === "weak_password") {
    sendError(res, 400, "weak_password", error.message);
    return;
  }
  if (error?.code === "over_email_send_rate_limit") {
    sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    return;
  }
  // The last seat went while this one was on its way (the database refused it).
  if (error && !(await signupsOpen())) {
    sendError(res, 403, "signups_closed", FULL);
    return;
  }
  if (error) console.error("signup failed:", error.code ?? error.name);
  res.status(202).json({ message: "Check your email to confirm your account" });
};

export default handler;
