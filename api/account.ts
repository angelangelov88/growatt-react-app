import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AccountExport } from "../src/types/Api";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { rateLimit } from "./_lib/rateLimit";
import { requireUser } from "./_lib/session";
import { requireStepUp } from "./_lib/stepUp";
import { supabaseAdmin } from "./_lib/supabase";
import { readSettings, readStatus } from "./_lib/userData";

type AuditRow = {
  created_at: Date;
  action: string;
  details: unknown;
  ip: string | null;
};

// GET → AccountExport, as a download.
// DELETE → 204. Deletes the user; their credentials, settings and audit log go
//   with them (on delete cascade). Needs a recent step-up. Clears the cookies.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "DELETE"]) || !checkOrigin(req, res))
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    if (!(await rateLimit(res, "export", userId))) return;
    // getUser asks Supabase, so it's current.
    const [{ data, error }, factors] = await Promise.all([
      user.supabase.auth.getUser(),
      user.supabase.auth.mfa.listFactors(),
    ]);
    if (error || factors.error) {
      sendError(res, 401, "unauthenticated", "Please log in");
      return;
    }
    const { settings, credentials, rows } = await withUser(
      userId,
      async (tx) => {
        await audit(tx, req, userId, "account_exported");
        return {
          settings: await readSettings(tx),
          credentials: await readStatus(tx),
          rows: await tx<AuditRow[]>`
            select created_at, action, details, host(ip) as ip
            from private.audit_log order by id`,
        };
      },
    );
    const body: AccountExport = {
      exportedAt: new Date().toISOString(),
      account: {
        id: userId,
        email: data.user.email ?? null,
        createdAt: data.user.created_at,
        lastSignInAt: data.user.last_sign_in_at ?? null,
        signInMethods: (data.user.identities ?? []).map((i) => i.provider),
        mfaEnrolled: factors.data.totp.length > 0,
      },
      settings,
      credentials,
      auditLog: rows.map((r) => ({
        at: r.created_at.toISOString(),
        action: r.action,
        details: r.details,
        ip: r.ip,
      })),
    };
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="growatt-app-data.json"',
    );
    res.json(body);
    return;
  }

  if (!(await requireStepUp(user, res))) return;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("account delete failed:", error.code ?? error.name);
    sendError(res, 500, "server_error", "Couldn't delete your account");
    return;
  }
  // Nothing about the user is left to audit, so this log line is the only record.
  console.info("account deleted:", userId);
  // The session died with the user; this clears the cookies.
  await user.supabase.auth.signOut({ scope: "local" });
  res.status(204).end();
};

export default handler;
