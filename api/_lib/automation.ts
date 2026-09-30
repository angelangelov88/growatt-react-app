import type { VercelRequest } from "@vercel/node";
import {
  buildChargePlan,
  describePeriods,
  describePlan,
  planMatches,
} from "../../src/lib/chargePlan";
import { resetDay } from "../../src/lib/dailyExport";
import {
  OctopusError,
  fetchPlannedDispatches,
  obtainToken,
} from "../../src/lib/octopusApi";
import type { Settings } from "../../src/types/Api";
import type { ChargePlan } from "../../src/types/Octopus";
import type {
  AutomationOutcome,
  AutomationResult,
  AutomationStateRow,
  AutomationTrigger,
  Tx,
} from "../../src/types/Server";
import { growattMessage, isOutage } from "../_handlers/growatt/periods";
import { octopusMessage } from "../_handlers/octopus/connect";
import { audit } from "./audit";
import { withUser } from "./db";
import { loadGrowatt, loadOctopus } from "./userConfig";
import { readKeptExport, readSettings } from "./userData";

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
        last_code, paused, export_restored_on::text as export_restored_on,
        export_failed_on::text as export_failed_on`,
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

type Growatt = NonNullable<Awaited<ReturnType<typeof loadGrowatt>>>;

const logIn = async (client: Growatt["client"]) => {
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
};

// Growatt calls after the login: a failure shows Growatt's message.
const onInverter = async <T>(step: () => Promise<T>) => {
  try {
    return await step();
  } catch (err) {
    throw new AutomationError("growatt_failed", growattMessage(err));
  }
};

// Reads the inverter's charge times and writes the plan unless it's already
// there. Returns true if it wrote.
const applyToInverter = async (
  { client, serial }: Growatt,
  plan: ChargePlan,
) => {
  await logIn(client);
  return onInverter(async () => {
    if (planMatches(plan, await client.fetchChargePeriods(serial)))
      return false;
    await client.setChargePeriods(
      serial,
      plan.powerRate,
      plan.stopSOC,
      ...plan.slots,
    );
    return true;
  });
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

// Automatic charging: builds the plan from the user's Octopus slots and sets
// the inverter's charge times if they differ. paused: a saved login was
// refused, so nothing else should try it this check.
const checkCharge = async (
  userId: string,
  settings: Settings,
  state: AutomationStateRow,
  trigger: AutomationTrigger,
  req: VercelRequest | null,
): Promise<{ outcome: AutomationOutcome; paused: boolean }> => {
  try {
    const { plan, reached, applied } = await sync(
      userId,
      settings,
      state,
      trigger === "check_now",
    );
    await withUser(userId, async (tx) => {
      await tx`
        update private.automation_state set
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
    return {
      outcome: { result: applied ? "applied" : "unchanged", plan },
      paused: false,
    };
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
        update private.automation_state set
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
    return { outcome: { result: "failed", plan: null }, paused: failure.pause };
  }
};

const isPercent = (n: number) => Number.isInteger(n) && n >= 1 && n <= 100;

// Export every day: after Growatt's nightly reset, reads the export times and
// writes the kept ones (last applied on the dashboard) back if they differ.
// Just turned on (nothing checked yet): keeps what's on the inverter instead,
// or puts the kept ones back if it's empty. Changes go in the audit log, and a
// failure once a day. A failed check is tried again 5 minutes later, except a
// refused login, which waits for the next reset so the account can't get
// locked.
const restoreExport = async (
  userId: string,
  state: AutomationStateRow,
  req: VercelRequest | null,
): Promise<AutomationResult> => {
  const day = resetDay();
  const isFirst = state.export_restored_on === null;
  const [plan, growatt] = await Promise.all([
    withUser(userId, readKeptExport),
    loadGrowatt(userId),
  ]);
  const markDone = (tx: Tx) =>
    tx`update private.automation_state set export_restored_on = ${day}::date`;
  if (!growatt || (!plan && !isFirst)) {
    await withUser(userId, markDone);
    return "unchanged";
  }
  try {
    const { client, serial } = growatt;
    await logIn(client);
    const current = await onInverter(() =>
      client.fetchDischargePeriods(serial),
    );
    const found = describePeriods(current);
    if (
      isFirst &&
      found !== "" &&
      isPercent(current.powerRate) &&
      isPercent(current.stopSOC)
    ) {
      await withUser(userId, async (tx) => {
        await tx`
          update private.user_settings set
            keep_export_power = ${current.powerRate},
            keep_export_stop = ${current.stopSOC}, keep_export_slots = ${found}
          where keep_export`;
        await markDone(tx);
      });
      return "unchanged";
    }
    const wrote =
      plan !== null &&
      describePlan(plan) !== "" &&
      !planMatches(plan, current) &&
      (await onInverter(async () => {
        await client.setDischargePeriods(
          serial,
          plan.powerRate,
          plan.stopSOC,
          ...plan.slots,
        );
        return true;
      }));
    await withUser(userId, async (tx) => {
      await markDone(tx);
      if (wrote)
        await audit(tx, req, userId, "export_restored", {
          ok: true,
          powerRate: Number(plan.powerRate),
          stopSOC: Number(plan.stopSOC),
          slots: describePlan(plan),
        });
    });
    return wrote ? "applied" : "unchanged";
  } catch (err) {
    const failure =
      err instanceof AutomationError
        ? err
        : new AutomationError("internal", "Something went wrong on our side");
    console.error(
      `export restore failed for ${userId.slice(0, 8)}:`,
      failure.code,
    );
    await withUser(userId, async (tx) => {
      if (failure.pause) await markDone(tx);
      if (state.export_failed_on === day) return;
      await tx`
        update private.automation_state set export_failed_on = ${day}::date`;
      await audit(tx, req, userId, "export_restored", {
        ok: false,
        code: failure.code,
        message: failure.message,
      });
    });
    return "failed";
  }
};

// Runs whichever of automatic charging and Export every day the user has on,
// holding the lease so only one check talks to their inverter at a time.
const check = async (
  userId: string,
  trigger: AutomationTrigger,
  req: VercelRequest | null,
): Promise<AutomationOutcome> => {
  const settings = await withUser(userId, readSettings);
  const { automationEnabled, exportEveryDay } = settings;
  if (!automationEnabled && !exportEveryDay)
    return { result: "skipped", plan: null };
  const state = await takeLease(userId);
  if (!state) return { result: "busy", plan: null };
  try {
    // Check now runs even when paused: the user may have fixed the login elsewhere.
    if (state.paused && trigger === "schedule")
      return { result: "paused", plan: null };

    let outcome: AutomationOutcome = { result: "unchanged", plan: null };
    let canRestore = true;
    if (automationEnabled) {
      const charge = await checkCharge(userId, settings, state, trigger, req);
      outcome = charge.outcome;
      // One inverter write per check (each takes 25–35s of the function's
      // 60), and no second go at a login that was just refused.
      canRestore = outcome.result !== "applied" && !charge.paused;
    }
    if (
      exportEveryDay &&
      canRestore &&
      state.export_restored_on !== resetDay()
    ) {
      const result = await restoreExport(userId, state, req);
      if (!automationEnabled) outcome = { result, plan: null };
    }
    return outcome;
  } finally {
    await withUser(
      userId,
      (tx) => tx`update private.automation_state set busy_until = null`,
    );
  }
};

// One automation check for one user: asks Octopus for their slots, works out
// the charge plan, and sets the inverter if it differs; and after Growatt's
// 23:30 reset, puts their export times back. The scheduled check
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
