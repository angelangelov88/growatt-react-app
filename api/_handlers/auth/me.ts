import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Me } from "../../../src/types/Api";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { requireUser } from "../../_lib/session";

// GET → who is logged in, and what they have set up. Never any secrets.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  // Answers before the MFA code too, so the app knows to ask for it.
  const user = await requireUser(req, res, { allowPendingMfa: true });
  if (!user) return;
  // Asked every time: an aal2 token outlives turning MFA off by up to 15
  // minutes, so the token can't say whether it's still on. Both lookups run
  // at once.
  const [factors, { providers, hasPassword }] = await Promise.all([
    user.supabase.auth.mfa.listFactors(),
    withUser(user.userId, async (tx) => {
      const providers = await tx<
        { provider: string }[]
      >`select provider from private.user_credentials`;
      // Always one row: the function answers false for an unknown user.
      const [{ has }] = await tx<
        { has: boolean }[]
      >`select private.has_password() as has`;
      return { providers, hasPassword: has };
    }),
  ]);
  if (factors.error) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return;
  }
  const has = (p: string) => providers.some((r) => r.provider === p);
  const me: Me = {
    email: user.claims.email ?? null,
    aal: user.claims.aal === "aal2" ? "aal2" : "aal1",
    mfaEnrolled: factors.data.totp.length > 0,
    hasPassword,
    hasGrowatt: has("growatt"),
    hasOctopus: has("octopus"),
  };
  res.json(me);
};

export default handler;
