import type { SlotParam } from "../types/Growatt";
import type { ChargePlan, Slots } from "../types/Octopus";
import { toUkMinutes } from "./chargePlan";

// Growatt clears the inverter's Grid First (export) times every night at
// 23:30 UK time. With Export every day on, the ones last applied are put back
// from a minute later.
const GROWATT_RESET = "23:30";
const RESTORE_FROM = 23 * 60 + 31;

const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

// The UK date (YYYY-MM-DD) of a moment.
const ukDay = (date: Date) => ukDate.format(date);

// The UK date (YYYY-MM-DD) of the last reset the times can be put back after:
// today from 23:31, before that yesterday. A restore is due when it hasn't
// been done for this date yet.
const resetDay = (now = new Date()) => {
  const minutes = toUkMinutes(now);
  if (minutes >= RESTORE_FROM) return ukDate.format(now);
  // A moment in the previous UK day.
  return ukDate.format(new Date(now.getTime() - (minutes + 1) * 60_000));
};

// "18:00-19:00, 20:00-22:15" (as describePlan writes it) back into a plan.
const keptPlan = (powerRate: number, stopSOC: number, slots: string) => {
  const parsed = slots
    .split(", ")
    .filter(Boolean)
    .map((s): SlotParam => {
      const [start, end] = s.split("-");
      return {
        startHour: start.slice(0, 2),
        startMin: start.slice(3, 5),
        endHour: end.slice(0, 2),
        endMin: end.slice(3, 5),
      };
    });
  const plan: ChargePlan = {
    powerRate: String(powerRate),
    stopSOC: String(stopSOC),
    slots: Array.from({ length: 6 }, (_, i) =>
      i < parsed.length ? parsed[i] : null,
    ) as Slots,
    skipped: 0,
  };
  return plan;
};

export { GROWATT_RESET, ukDay, resetDay, keptPlan };
