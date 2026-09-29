import type { VercelRequest, VercelResponse } from "@vercel/node";
import { settingsSchema } from "../src/lib/settingsSchema";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { requireUser } from "./_lib/session";
import { readSettings, recheckInverter } from "./_lib/userData";

// GET → Settings.
// PUT Settings → Settings. Automation can only be turned on once both Growatt
//   and Octopus credentials are saved.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "PUT"]) || !checkOrigin(req, res)) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    res.json(await withUser(userId, readSettings));
    return;
  }

  const body = settingsSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const settings = body.data;
  const saved = await withUser(userId, async (tx) => {
    if (settings.automationEnabled) {
      const [{ providers }] = await tx<{ providers: number }[]>`
        select count(*)::int as providers from private.user_credentials`;
      if (providers < 2) return null;
    }
    await tx`
      insert into private.user_settings
        (user_id, window_enabled, charge_start, charge_end, power_rate,
          stop_soc, automation_enabled)
      values (${userId}, ${settings.windowEnabled}, ${settings.chargeStart},
        ${settings.chargeEnd}, ${settings.powerRate}, ${settings.stopSOC},
        ${settings.automationEnabled})
      on conflict (user_id) do update set
        window_enabled = excluded.window_enabled,
        charge_start = excluded.charge_start, charge_end = excluded.charge_end,
        power_rate = excluded.power_rate, stop_soc = excluded.stop_soc,
        automation_enabled = excluded.automation_enabled`;
    // The inverter may have changed while automation was off.
    await recheckInverter(tx);
    await audit(tx, req, userId, "settings_saved", settings);
    return readSettings(tx);
  });
  if (!saved) {
    sendError(
      res,
      409,
      "credentials_missing",
      "Save your Growatt and Octopus details before turning on automation",
    );
    return;
  }
  res.json(saved);
};

export default handler;
