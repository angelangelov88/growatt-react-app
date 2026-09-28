import {
  buildChargePlan,
  describePlan,
  planMatches,
} from "../../src/lib/chargePlan";
import {
  OctopusError,
  fetchPlannedDispatches,
  obtainToken,
} from "../../src/lib/octopusApi";
import type { AutomationResult } from "../../src/types/Server";
import { growattMessage } from "../_handlers/growatt/periods";
import { octopusMessage } from "../_handlers/octopus/connect";
import { audit } from "./audit";
import { withUser } from "./db";
import { loadGrowatt, loadOctopus } from "./userConfig";
import { readSettings } from "./userData";

// A failure whose code and message are safe to show the user (they're in their
// data export).
class AutomationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// What the Apply button does, for one user: builds the charge plan from their
// Octopus slots and saved settings, and writes it unless the inverter already
// has it. Throws AutomationError.
const applyPlan = async (userId: string) => {
  const settings = await withUser(userId, readSettings);
  if (!settings.automationEnabled) return { result: "skipped" as const };
  const [octopus, growatt] = await Promise.all([
    loadOctopus(userId),
    loadGrowatt(userId),
  ]);
  if (!octopus || !growatt)
    throw new AutomationError(
      "not_set_up",
      "Your Growatt or Octopus details are missing",
    );

  let token: string;
  try {
    token = await obtainToken(octopus.apiKey);
  } catch (err) {
    throw err instanceof OctopusError
      ? new AutomationError(
          "octopus_key_failed",
          "Octopus didn't accept your saved API key. If you replaced it, update it in Settings",
        )
      : new AutomationError("octopus_failed", octopusMessage(err));
  }
  let dispatches;
  try {
    dispatches = await fetchPlannedDispatches(token, octopus.account);
  } catch (err) {
    throw new AutomationError("octopus_failed", octopusMessage(err));
  }
  const plan = buildChargePlan(dispatches, settings);

  const { client, serial } = growatt;
  try {
    await client.login();
  } catch {
    throw new AutomationError(
      "growatt_login_failed",
      "Couldn't log in to Growatt. If you changed your Growatt password, update it in Settings",
    );
  }
  try {
    const current = await client.fetchChargePeriods(serial);
    if (planMatches(plan, current)) return { result: "unchanged" as const };
    await client.setChargePeriods(
      serial,
      plan.powerRate,
      plan.stopSOC,
      ...plan.slots,
    );
  } catch (err) {
    throw new AutomationError("growatt_failed", growattMessage(err));
  }
  return { result: "applied" as const, plan };
};

// Runs one user and never throws, so one user's problem can't stop the others.
// Writes and failures go in their audit log; "nothing to change" doesn't, as it
// happens on most runs.
const runAutomation = async (userId: string): Promise<AutomationResult> => {
  let details: Record<string, string | number>;
  let result: AutomationResult;
  try {
    const outcome = await applyPlan(userId);
    if (outcome.result !== "applied") return outcome.result;
    const { plan } = outcome;
    result = "applied";
    details = {
      powerRate: plan.powerRate,
      stopSOC: plan.stopSOC,
      slots: describePlan(plan),
      skipped: plan.skipped,
    };
  } catch (err) {
    result = "failed";
    details =
      err instanceof AutomationError
        ? { code: err.code, message: err.message }
        : { code: "internal", message: "Something went wrong on our side" };
    // Only codes and messages, never the error object; the user id is shortened.
    console.error(
      `automation failed for ${userId.slice(0, 8)}:`,
      err instanceof AutomationError
        ? err.code
        : err instanceof Error
          ? err.message
          : "unknown error",
    );
  }
  try {
    await withUser(userId, (tx) =>
      audit(tx, null, userId, "automation_run", { result, ...details }),
    );
  } catch (err) {
    console.error(
      `automation audit failed for ${userId.slice(0, 8)}:`,
      err instanceof Error ? err.message : "unknown error",
    );
  }
  return result;
};

export { runAutomation };
