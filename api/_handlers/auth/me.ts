import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Me } from "../../../src/types/Api";
import { withUser } from "../../_lib/db";
import { allowMethods } from "../../_lib/http";
import { requireUser } from "../../_lib/session";

// GET → who is logged in, and what they have set up. Never any secrets.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  // Answers before the MFA code too, so the app knows to ask for it.
  const user = await requireUser(req, res, { allowPendingMfa: true });
  if (!user) return;
  const providers = await withUser(
    user.userId,
    (tx) =>
      tx<{ provider: string }[]>`select provider from private.user_credentials`,
  );
  const has = (p: string) => providers.some((r) => r.provider === p);
  const me: Me = {
    email: user.claims.email ?? null,
    aal: user.claims.aal === "aal2" ? "aal2" : "aal1",
    mfaEnrolled: user.mfaEnrolled,
    hasGrowatt: has("growatt"),
    hasOctopus: has("octopus"),
  };
  res.json(me);
};

export default handler;
