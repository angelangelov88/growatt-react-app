import { isIP } from "node:net";
import type { VercelRequest } from "@vercel/node";
import type { AuditAction, Tx } from "../../src/types/Server";

// Vercel sets x-real-ip to the caller's address, and callers can't override it.
const clientIp = (req: VercelRequest) => {
  const ip = req.headers["x-real-ip"];
  return typeof ip === "string" && isIP(ip) ? ip : null;
};

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
