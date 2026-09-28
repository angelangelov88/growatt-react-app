import type { VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
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

// Checks the user's current password by logging in with it on a separate,
// cookie-less client, then ends that extra session at once. The user's own
// session is untouched.
const checkPassword = async (user: SessionUser, password: string) => {
  const email = user.claims.email;
  if (!email) return "wrong";
  const client = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error?.status === 429) return "rate_limited";
  if (error?.code === "invalid_credentials") return "wrong";
  if (error) {
    console.error("password check failed:", error.code ?? error.name);
    return "failed";
  }
  const { error: signOutError } = await client.auth.signOut({
    scope: "local",
  });
  if (signOutError)
    console.error(
      "ending the check session failed:",
      signOutError.code ?? signOutError.name,
    );
  return data.user.id === user.userId ? "ok" : "wrong";
};

// Call before a sensitive change (credentials, password, removing MFA). Passes
// when the user proved who they are: with their authenticator app in the last
// 5 minutes if they have one; otherwise with currentPassword, if given, or a
// login in the last 5 minutes. Otherwise responds 403 with mfa_required or
// reauth_required (or 400 wrong_password), which the app turns into the right
// prompt.
const requireStepUp = async (
  user: SessionUser,
  res: VercelResponse,
  { currentPassword }: { currentPassword?: string } = {},
) => {
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
  if (currentPassword !== undefined) {
    const result = await checkPassword(user, currentPassword);
    if (result === "ok") return true;
    if (result === "wrong")
      sendError(res, 400, "wrong_password", "Your current password is wrong");
    else if (result === "rate_limited")
      sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    else sendError(res, 500, "server_error", "Couldn't check your password");
    return false;
  }
  if (lastUsed(user, () => true) >= since) return true;
  sendError(res, 403, "reauth_required", "Log in again to continue");
  return false;
};

export { requireStepUp };
