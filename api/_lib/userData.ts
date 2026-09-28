import { defaultSettings } from "../../src/lib/settingsSchema";
import type { Credentials, Settings } from "../../src/types/Api";
import type { Provider, Tx } from "../../src/types/Server";

// Reads of the user's own rows, shared by several endpoints. Run inside withUser.

type SettingsRow = {
  charge_start: string | null;
  charge_end: string | null;
  power_rate: number | null;
  stop_soc: number | null;
  automation_enabled: boolean;
};

// The user's settings, or the defaults for anything not saved yet.
const readSettings = async (tx: Tx): Promise<Settings> => {
  const rows = await tx<SettingsRow[]>`
    select charge_start::text as charge_start, charge_end::text as charge_end,
      power_rate, stop_soc, automation_enabled
    from private.user_settings`;
  const row = rows.at(0);
  return {
    // Postgres gives HH:MM:SS.
    chargeStart: row?.charge_start?.slice(0, 5) ?? defaultSettings.chargeStart,
    chargeEnd: row?.charge_end?.slice(0, 5) ?? defaultSettings.chargeEnd,
    powerRate: row?.power_rate ?? defaultSettings.powerRate,
    stopSOC: row?.stop_soc ?? defaultSettings.stopSOC,
    automationEnabled: row?.automation_enabled ?? false,
  };
};

// What's saved, never the secrets.
const readStatus = async (tx: Tx): Promise<Credentials> => {
  const rows = await tx<
    { provider: Provider; identifier: string; verified_at: Date }[]
  >`select provider, identifier, verified_at from private.user_credentials`;
  const find = (provider: Provider) => {
    const row = rows.find((r) => r.provider === provider);
    return row && { id: row.identifier, at: row.verified_at.toISOString() };
  };
  const growatt = find("growatt");
  const octopus = find("octopus");
  return {
    growatt: growatt ? { serial: growatt.id, verifiedAt: growatt.at } : null,
    octopus: octopus ? { account: octopus.id, verifiedAt: octopus.at } : null,
  };
};

export { readSettings, readStatus };
