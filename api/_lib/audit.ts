import type { VercelRequest } from "@vercel/node";
import type { SignInMethod } from "../../src/types/Api";
import type { AuditAction, Tx } from "../../src/types/Server";
import { withUser } from "./db";
import { clientIp } from "./http";

// Records a security-relevant action in private.audit_log. Run it inside
// withUser. details must never contain a secret. req is null for the scheduled
// job, which acts for the user without a request from them (so no IP).
const audit = (
  tx: Tx,
  req: VercelRequest | null,
  userId: string,
  action: AuditAction,
  details: Record<string, string | number | boolean | null> = {},
) =>
  tx`insert into private.audit_log (user_id, action, details, ip)
    values (${userId}, ${action}, ${tx.json(details)}, ${req && clientIp(req)})`;

// Records a login. A failure here never stops the login itself.
const auditSignIn = async (
  req: VercelRequest,
  userId: string,
  method: SignInMethod,
) => {
  try {
    await withUser(userId, (tx) =>
      audit(tx, req, userId, "signed_in", { method }),
    );
  } catch {
    console.error("sign-in audit failed");
  }
};

export { audit, auditSignIn };
