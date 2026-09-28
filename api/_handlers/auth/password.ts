import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  newPasswordSchema,
  resetRequestSchema,
} from "../../../src/lib/authSchemas";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { createSupabase, requireUser } from "../../_lib/session";
import { requireStepUp } from "../../_lib/stepUp";

const RATE_LIMITED = "Too many attempts, try again later";

// POST { email } → 202. Sends a reset link if the email has an account; the
//   same answer either way, so it can't be used to find accounts. The link goes
//   to /api/auth/confirm (set in Supabase's template), which signs the user in
//   and sends them to /reset-password.
// PUT { password } → 204. Sets a new password and signs out the user's other
//   sessions. Needs a recent step-up: the reset link counts as a fresh login,
//   and users with MFA also need their app's code, so a stolen inbox alone
//   can't take over the account.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST", "PUT"]) || !checkOrigin(req, res))
    return;
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method === "POST") {
    const body = resetRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendError(res, 400, "invalid_input", "Enter your email");
      return;
    }
    const { error } = await createSupabase(req, res).auth.resetPasswordForEmail(
      body.data.email,
    );
    if (error?.status === 429) {
      sendError(res, 429, "rate_limited", RATE_LIMITED);
      return;
    }
    if (error)
      console.error("password reset failed:", error.code ?? error.name);
    res.status(202).json({
      message: "If that email has an account, we've sent a link to reset it",
    });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;
  const body = newPasswordSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  if (!(await requireStepUp(user, res))) return;

  const { auth } = user.supabase;
  const { error } = await auth.updateUser({ password: body.data.password });
  if (error?.code === "same_password") {
    sendError(res, 400, "same_password", "Choose a different password");
    return;
  }
  if (error?.code === "weak_password") {
    sendError(res, 400, "weak_password", error.message);
    return;
  }
  if (error?.status === 429) {
    sendError(res, 429, "rate_limited", RATE_LIMITED);
    return;
  }
  if (error) {
    console.error("password change failed:", error.code ?? error.name);
    sendError(res, 500, "server_error", "Couldn't change your password");
    return;
  }
  // Anyone else holding a session loses it once their access token expires.
  const { error: signOutError } = await auth.signOut({ scope: "others" });
  if (signOutError)
    console.error(
      "sign out others failed:",
      signOutError.code ?? signOutError.name,
    );
  await withUser(user.userId, (tx) =>
    audit(tx, req, user.userId, "password_changed", {
      otherSessionsEnded: !signOutError,
    }),
  );
  res.status(204).end();
};

export default handler;
