import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mfaSchema } from "../../../src/lib/authSchemas";
import type { MfaEnrollment } from "../../../src/types/Api";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { requireStepUp } from "../../_lib/stepUp";

// Authenticator-app (TOTP) MFA, one app per user.
// POST { action: "enroll" } → 200 MfaEnrollment. Starts setup.
// POST { action: "verify", code } → 204. Finishes setup, or is the step-up
//   check before a sensitive change. Upgrades the session to aal2.
// DELETE → 204. Removes it; needs a recent step-up.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST", "DELETE"]) || !checkOrigin(req, res))
    return;
  // Verify is how a user with MFA finishes logging in. Enroll then answers
  // already_enrolled, and DELETE's step-up still asks for the code.
  const user = await requireUser(req, res, { allowPendingMfa: true });
  if (!user) return;
  if (!(await rateLimit(res, "mfa", user.userId))) return;
  const { mfa } = user.supabase.auth;
  const { data: factors, error } = await mfa.listFactors();
  if (error) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return;
  }
  const verified = factors.totp.at(0);
  const pending = factors.all
    .filter((f) => f.factor_type === "totp" && f.status === "unverified")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (req.method === "DELETE") {
    if (!verified) {
      sendError(res, 404, "not_enrolled", "MFA isn't set up");
      return;
    }
    if (!(await requireStepUp(user, res))) return;
    const { error: unenrollError } = await mfa.unenroll({
      factorId: verified.id,
    });
    if (unenrollError) {
      console.error("mfa unenroll failed:", unenrollError.code);
      sendError(res, 502, "mfa_failed", "Couldn't remove MFA, try again");
      return;
    }
    await withUser(user.userId, (tx) =>
      audit(tx, req, user.userId, "mfa_removed"),
    );
    res.status(204).end();
    return;
  }

  const body = mfaSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }

  if (body.data.action === "enroll") {
    if (verified) {
      sendError(res, 409, "already_enrolled", "MFA is already set up");
      return;
    }
    // Drop any unfinished setup, so there's only ever one.
    await Promise.all(pending.map((f) => mfa.unenroll({ factorId: f.id })));
    const { data, error: enrollError } = await mfa.enroll({
      factorType: "totp",
      issuer: "Growatt App",
    });
    if (enrollError) {
      console.error("mfa enroll failed:", enrollError.code);
      sendError(res, 502, "mfa_failed", "Couldn't start MFA setup, try again");
      return;
    }
    const { qr_code: qr, secret } = data.totp;
    const enrollment: MfaEnrollment = {
      qrCode: qr.startsWith("data:")
        ? qr
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`,
      secret,
    };
    res.json(enrollment);
    return;
  }

  // verify: the app's factor if set up, otherwise the one being set up.
  const factor = verified ?? pending.at(0);
  if (!factor) {
    sendError(res, 409, "not_enrolled", "Start MFA setup first");
    return;
  }
  const { error: verifyError } = await mfa.challengeAndVerify({
    factorId: factor.id,
    code: body.data.code,
  });
  if (verifyError?.status === 429) {
    sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    return;
  }
  if (verifyError) {
    sendError(res, 400, "invalid_code", "That code didn't work, try again");
    return;
  }
  if (!verified)
    await withUser(user.userId, (tx) =>
      audit(tx, req, user.userId, "mfa_enrolled"),
    );
  res.status(204).end();
};

export default handler;
