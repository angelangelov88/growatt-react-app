import type { ChargePeriods, SlotParam } from "../growatt/growattApi";

// Decides what charge periods to write to the inverter from Octopus dispatches.
// Shared by the "Apply Slots to Growatt" button and the GitHub Action script, so it
// must stay free of browser-only and React code.
//
// Rules:
// - Rate 35%, stop SOC 95%.
// - Slot 1 is always the fixed overnight window, 01:00–05:00.
// - Octopus periods are trimmed to the parts outside that window (dropped entirely if
//   inside it, split in two if they span it), then touching or overlapping ones merged.
// - The inverter has 6 slots, so at most 5 Octopus periods are kept, soonest first.
// - All times are UK local time, whatever time zone the machine is in.

export type Dispatch = { startDt: string; endDt: string };

type Slots = [SlotParam, SlotParam, SlotParam, SlotParam, SlotParam, SlotParam];

export type ChargePlan = {
  powerRate: string;
  stopSOC: string;
  // The fixed window first, then Octopus periods, padded with null.
  slots: Slots;
  // Octopus periods left out because the inverter only has 6 slots.
  skipped: number;
};

const POWER_RATE = "35";
const STOP_SOC = "95";
const MAX_SLOTS = 6;
const DAY = 24 * 60;
const WINDOW_START = 1 * 60; // 01:00
const WINDOW_END = 5 * 60; // 05:00

// A period in minutes past midnight, within a single day (0 to DAY).
// `firstStart` is the earliest real start time it came from, for "soonest first".
type Piece = { start: number; end: number; firstStart: number };

const ukTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const toUkMinutes = (date: Date) => {
  const parts = ukTime.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return get("hour") * 60 + get("minute");
};

const pad = (n: number) => String(n).padStart(2, "0");

// `end` may run past midnight (above DAY) for a period that crosses it.
const toSlot = (start: number, end: number): SlotParam => ({
  startHour: pad(Math.floor(start / 60)),
  startMin: pad(start % 60),
  endHour: pad(Math.floor((end % DAY) / 60)),
  endMin: pad(end % 60),
});

// A dispatch crossing midnight becomes two same-day pieces.
const toPieces = (dispatch: Dispatch): Piece[] => {
  const start = toUkMinutes(new Date(dispatch.startDt));
  let end = toUkMinutes(new Date(dispatch.endDt));
  if (end <= start) end += DAY;
  const firstStart = new Date(dispatch.startDt).getTime();
  if (end <= DAY) return [{ start, end, firstStart }];
  return [
    { start, end: DAY, firstStart },
    { start: 0, end: end - DAY, firstStart },
  ];
};

// Keeps only what falls before or after the fixed window.
const outsideWindow = (piece: Piece): Piece[] =>
  [
    { ...piece, end: Math.min(piece.end, WINDOW_START) },
    { ...piece, start: Math.max(piece.start, WINDOW_END) },
  ].filter((p) => p.end > p.start);

const merge = (pieces: Piece[]): Piece[] => {
  const merged: Piece[] = [];
  for (const piece of [...pieces].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && piece.start <= last.end) {
      last.end = Math.max(last.end, piece.end);
      last.firstStart = Math.min(last.firstStart, piece.firstStart);
    } else {
      merged.push({ ...piece });
    }
  }
  // Rejoin a period split at midnight into a single slot that crosses it.
  const first = merged[0];
  const last = merged[merged.length - 1];
  if (merged.length > 1 && first.start === 0 && last.end === DAY) {
    merged.shift();
    last.end = DAY + first.end;
    last.firstStart = Math.min(last.firstStart, first.firstStart);
  }
  return merged;
};

export const buildChargePlan = (
  dispatches: Dispatch[],
  now = new Date(),
): ChargePlan => {
  const upcoming = dispatches.filter((d) => {
    const start = new Date(d.startDt);
    const end = new Date(d.endDt);
    return end > now && end > start;
  });
  const periods = merge(upcoming.flatMap(toPieces).flatMap(outsideWindow)).sort(
    (a, b) => a.firstStart - b.firstStart,
  );
  const kept = periods.slice(0, MAX_SLOTS - 1);
  const slots: SlotParam[] = [
    toSlot(WINDOW_START, WINDOW_END),
    ...kept.map((p) => toSlot(p.start, p.end)),
  ];
  while (slots.length < MAX_SLOTS) slots.push(null);
  return {
    powerRate: POWER_RATE,
    stopSOC: STOP_SOC,
    slots: slots as Slots,
    skipped: periods.length - kept.length,
  };
};

const formatSlot = (s: NonNullable<SlotParam>) =>
  `${s.startHour}:${s.startMin}-${s.endHour}:${s.endMin}`;

// e.g. "01:00-05:00, 18:00-19:00"
export const describePlan = (plan: ChargePlan) =>
  plan.slots
    .filter((s): s is NonNullable<SlotParam> => s !== null)
    .map(formatSlot)
    .join(", ");

// True when the inverter already has exactly this plan, so there's nothing to write.
export const planMatches = (plan: ChargePlan, current: ChargePeriods) => {
  if (
    String(current.powerRate) !== plan.powerRate ||
    String(current.stopSOC) !== plan.stopSOC
  )
    return false;
  const have = [
    current.period1,
    current.period2,
    current.period3,
    current.period4,
    current.period5,
    current.period6,
  ]
    .filter((p) => p.enabled && p.start !== "--")
    .map((p) => `${p.start}-${p.end}`);
  return describePlan(plan) === have.join(", ");
};
