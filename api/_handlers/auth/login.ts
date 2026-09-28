import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loginSchema } from "../../../src/lib/authSchemas";
import { checkOrigin } from "../../_lib/csrf";
import { allowMethods, sendError } from "../../_lib/http";
import { limitByIp } from "../../_lib/rateLimit";
import { createSupabase } from "../../_lib/session";

// POST { email, password } → 204 and session cookies.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");
  if (!(await limitByIp(req, res, "login"))) return;
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "invalid_input", "Enter your email and password");
    return;
  }
  const { error } = await createSupabase(req, res).auth.signInWithPassword(
    body.data,
  );
  if (error?.code === "email_not_confirmed") {
    sendError(res, 403, "email_not_confirmed", "Confirm your email first");
    return;
  }
  if (error?.status === 429) {
    sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    return;
  }
  if (error) {
    // One message for a wrong email or a wrong password.
    sendError(res, 401, "invalid_credentials", "Invalid email or password");
    return;
  }
  res.status(204).end();
};

export default handler;
