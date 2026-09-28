import type { VercelRequest, VercelResponse } from "@vercel/node";
import { defaultSettings, settingsSchema } from "../src/lib/settingsSchema";
import type { Settings } from "../src/types/Api";
import type { Tx } from "../src/types/Server";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { requireUser } from "./_lib/session";

type SettingsRow = {
  charge_start: string | null;
  charge_end: string | null;
  automation_enabled: boolean;
};

// The user's settings, or the defaults for anything not saved yet.
const readSettings = async (tx: Tx): Promise<Settings> => {
  const rows = await tx<SettingsRow[]>`
    select charge_start::text as charge_start, charge_end::text as charge_end,
      automation_enabled
    from private.user_settings`;
  const row = rows.at(0);
  return {
    // Postgres gives HH:MM:SS.
    chargeStart: row?.charge_start?.slice(0, 5) ?? defaultSettings.chargeStart,
    chargeEnd: row?.charge_end?.slice(0, 5) ?? defaultSettings.chargeEnd,
    automationEnabled: row?.automation_enabled ?? false,
  };
};

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
        (user_id, charge_start, charge_end, automation_enabled)
      values (${userId}, ${settings.chargeStart}, ${settings.chargeEnd},
        ${settings.automationEnabled})
      on conflict (user_id) do update set
        charge_start = excluded.charge_start, charge_end = excluded.charge_end,
        automation_enabled = excluded.automation_enabled`;
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
