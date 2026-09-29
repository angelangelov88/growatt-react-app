import type { VercelRequest } from "@vercel/node";
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
import type { Settings } from "../../src/types/Api";
import type { ChargePlan } from "../../src/types/Octopus";
import type {
  AutomationOutcome,
  AutomationStateRow,
  AutomationTrigger,
} from "../../src/types/Server";
import { growattMessage, isOutage } from "../_handlers/growatt/periods";
import { octopusMessage } from "../_handlers/octopus/connect";
import { audit } from "./audit";
import { withUser } from "./db";
import { loadGrowatt, loadOctopus } from "./userConfig";
import { readSettings } from "./userData";

// How often the inverter is read even when the plan hasn't changed, in case it
// was changed some other way (Growatt's own app, say).
const RECHECK_MS = 3 * 60 * 60 * 1000;

// A failure whose code and message are safe to show the user (they're on the
// dashboard and in their data export). pause: a saved login was refused, and
// retrying it every 5 minutes could get the account locked.
class AutomationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly pause = false,
  ) {
    super(message);
  }
}

// Marks the user busy and returns their state, or null if another check is
// running. The mark runs out after 90s, longer than a function can run, so a
// check that dies can't block the user for long.
const takeLease = async (userId: string) => {
  const rows = await withUser(
    userId,
    (tx) => tx<AutomationStateRow[]>`
      insert into private.automation_state as s (user_id, busy_until)
      values (${userId}, now() + interval '90 seconds')
      on conflict (user_id) do update set busy_until = excluded.busy_until
      where s.busy_until is null or s.busy_until < now()
      returning plan_power, plan_stop, plan_slots, inverter_checked_at,
        last_code, paused`,
  );
  return rows.at(0) ?? null;
};

// True when the inverter was last seen with exactly this plan.
const isKnownPlan = (state: AutomationStateRow, plan: ChargePlan) =>
  state.plan_slots === describePlan(plan) &&
  String(state.plan_power) === plan.powerRate &&
  String(state.plan_stop) === plan.stopSOC;

const fetchDispatches = async (apiKey: string, account: string) => {
  let token: string;
  try {
    token = await obtainToken(apiKey);
  } catch (err) {
    throw err instanceof OctopusError
      ? new AutomationError(
          "octopus_key_failed",
          "Octopus didn't accept your saved API key. If you replaced it, update it in Settings",
          true,
        )
      : new AutomationError("octopus_failed", octopusMessage(err));
  }
  try {
    return await fetchPlannedDispatches(token, account);
  } catch (err) {
    throw new AutomationError("octopus_failed", octopusMessage(err));
  }
};

// Reads the inverter and writes the plan unless it's already there. Returns
// true if it wrote.
const applyToInverter = async (
  growatt: NonNullable<Awaited<ReturnType<typeof loadGrowatt>>>,
  plan: ChargePlan,
) => {
  const { client, serial } = growatt;
  try {
    await client.login();
  } catch (err) {
    throw isOutage(err)
      ? new AutomationError("growatt_unavailable", "Growatt didn't respond")
      : new AutomationError(
          "growatt_login_failed",
          "Couldn't log in to Growatt. If you changed your Growatt password, update it in Settings",
          true,
        );
  }
  try {
    const current = await client.fetchChargePeriods(serial);
    if (planMatches(plan, current)) return false;
    await client.setChargePeriods(
      serial,
      plan.powerRate,
      plan.stopSOC,
      ...plan.slots,
    );
    return true;
  } catch (err) {
    throw new AutomationError("growatt_failed", growattMessage(err));
  }
};

// Builds the plan from the user's Octopus slots, and only goes to the
// inverter (slow, and Growatt's API is unofficial) if the plan isn't what it
// last had, it hasn't been read for a while, or force. reached: it did.
const sync = async (
  userId: string,
  settings: Settings,
  state: AutomationStateRow,
  force: boolean,
) => {
  const [octopus, growatt] = await Promise.all([
    loadOctopus(userId),
    loadGrowatt(userId),
  ]);
  if (!octopus || !growatt)
    throw new AutomationError(
      "not_set_up",
      "Your Growatt or Octopus details are missing",
    );
  const plan = buildChargePlan(
    await fetchDispatches(octopus.apiKey, octopus.account),
    settings,
  );
  const isRecent =
    state.inverter_checked_at !== null &&
    Date.now() - state.inverter_checked_at.getTime() < RECHECK_MS;
  if (!force && isRecent && isKnownPlan(state, plan))
    return { plan, reached: false, applied: false };
  return { plan, reached: true, applied: await applyToInverter(growatt, plan) };
};

const check = async (
  userId: string,
  trigger: AutomationTrigger,
  req: VercelRequest | null,
): Promise<AutomationOutcome> => {
  const settings = await withUser(userId, readSettings);
  if (!settings.automationEnabled) return { result: "skipped", plan: null };
  const state = await takeLease(userId);
  if (!state) return { result: "busy", plan: null };
  // Check now runs even when paused: the user may have fixed the login elsewhere.
  if (state.paused && trigger === "schedule") {
    await withUser(
      userId,
      (tx) => tx`update private.automation_state set busy_until = null`,
    );
    return { result: "paused", plan: null };
  }

  try {
    const { plan, reached, applied } = await sync(
      userId,
      settings,
      state,
      trigger === "check_now",
    );
    await withUser(userId, async (tx) => {
      await tx`
        update private.automation_state set busy_until = null,
          checked_at = now(), last_code = null, last_message = null,
          paused = false`;
      if (reached)
        await tx`
          update private.automation_state set
            plan_power = ${Number(plan.powerRate)},
            plan_stop = ${Number(plan.stopSOC)},
            plan_slots = ${describePlan(plan)}, inverter_checked_at = now(),
            applied_at = case when ${applied} then now() else applied_at end`;
      // Changes to the inverter always go in the audit log; a quiet check
      // only when it ends a run of failures.
      if (applied)
        await audit(tx, req, userId, "automation_run", {
          result: "applied",
          trigger,
          powerRate: plan.powerRate,
          stopSOC: plan.stopSOC,
          slots: describePlan(plan),
          skipped: plan.skipped,
        });
      else if (state.last_code)
        await audit(tx, req, userId, "automation_run", {
          result: "recovered",
          trigger,
        });
    });
    return { result: applied ? "applied" : "unchanged", plan };
  } catch (err) {
    const failure =
      err instanceof AutomationError
        ? err
        : new AutomationError("internal", "Something went wrong on our side");
    // Only codes and messages, never the error object; the user id is shortened.
    console.error(
      `automation failed for ${userId.slice(0, 8)}:`,
      err instanceof AutomationError
        ? err.code
        : err instanceof Error
          ? err.message
          : "unknown error",
    );
    await withUser(userId, async (tx) => {
      // The inverter may be half-written, so the next check reads it.
      await tx`
        update private.automation_state set busy_until = null,
          checked_at = now(), last_code = ${failure.code},
          last_message = ${failure.message}, paused = ${failure.pause},
          inverter_checked_at = null`;
      // Once per problem, not every 5 minutes while it lasts.
      if (state.last_code !== failure.code)
        await audit(tx, req, userId, "automation_run", {
          result: "failed",
          trigger,
          code: failure.code,
          message: failure.message,
          paused: failure.pause,
        });
    });
    return { result: "failed", plan: null };
  }
};

// One automation check for one user: asks Octopus for their slots, works out
// the charge plan, and sets the inverter if it differs. The scheduled check
// skips paused users and trusts what it last saw on the inverter for up to 3
// hours; Check now always reads the inverter. req: the user's request, for the
// audit log's IP (null for the schedule). Never throws.
const checkUser = async (
  userId: string,
  trigger: AutomationTrigger,
  req: VercelRequest | null = null,
): Promise<AutomationOutcome> => {
  try {
    return await check(userId, trigger, req);
  } catch (err) {
    console.error(
      `automation check failed for ${userId.slice(0, 8)}:`,
      err instanceof Error ? err.message : "unknown error",
    );
    return { result: "failed", plan: null };
  }
};

export { checkUser };
