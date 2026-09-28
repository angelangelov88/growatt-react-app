import type { VercelResponse } from "@vercel/node";
import type { AMREntry } from "@supabase/supabase-js";
import type { SessionUser } from "../../src/types/Server";
import { sendError } from "./http";

const MAX_AGE_SECONDS = 5 * 60;
const MFA_METHODS = new Set(["totp", "mfa/totp"]);

// The last time (unix seconds) the user signed in with a matching method, from
// the verified access token. 0 if never.
const lastUsed = (user: SessionUser, match: (method: string) => boolean) =>
  Math.max(
    0,
    ...(user.claims.amr ?? [])
      .filter((e): e is AMREntry => typeof e === "object")
      .filter((e) => match(e.method))
      .map((e) => e.timestamp),
  );

// Call before a sensitive change (credentials, removing MFA). Passes when the
// user proved who they are in the last 5 minutes: with their authenticator app
// if they have one, otherwise by logging in. Otherwise responds 403 with
// mfa_required or reauth_required, which the app turns into the right prompt.
const requireStepUp = async (user: SessionUser, res: VercelResponse) => {
  // Asks Supabase, so a factor added in another session still counts.
  const { data, error } = await user.supabase.auth.mfa.listFactors();
  if (error) {
    sendError(res, 401, "unauthenticated", "Please log in");
    return false;
  }
  const since = Date.now() / 1000 - MAX_AGE_SECONDS;
  if (data.totp.length > 0) {
    const recentMfa = lastUsed(user, (m) => MFA_METHODS.has(m)) >= since;
    if (user.claims.aal === "aal2" && recentMfa) return true;
    sendError(res, 403, "mfa_required", "Enter the code from your app");
    return false;
  }
  if (lastUsed(user, () => true) >= since) return true;
  sendError(res, 403, "reauth_required", "Log in again to continue");
  return false;
};

export { requireStepUp };
