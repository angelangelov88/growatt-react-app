import type { VercelRequest, VercelResponse } from "@vercel/node";
import { signupSchema } from "../../src/lib/authSchemas";
import { checkOrigin } from "../_lib/csrf";
import { allowMethods, sendError } from "../_lib/http";
import { createSupabase } from "../_lib/session";

// POST { email, password } → 202. Always the same answer, whether or not the
// email is already registered, so it can't be used to find accounts.
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
  if (error) console.error("signup failed:", error.code ?? error.name);
  res.status(202).json({ message: "Check your email to confirm your account" });
};

export default handler;
