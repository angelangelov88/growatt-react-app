import type { VercelRequest } from "@vercel/node";
import type { AuditAction, Tx } from "../../src/types/Server";
import { clientIp } from "./http";

// Records a security-relevant action in private.audit_log. Run it inside
// withUser. details must never contain a secret.
const audit = (
  tx: Tx,
  req: VercelRequest,
  userId: string,
  action: AuditAction,
  details: Record<string, string | number | boolean | null> = {},
) =>
  tx`insert into private.audit_log (user_id, action, details, ip)
    values (${userId}, ${action}, ${tx.json(details)}, ${clientIp(req)})`;

export { audit };
