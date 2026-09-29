import type { SlotState } from "../../types/Growatt";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
// 5-minute steps; minuteOptions adds any other value read from the inverter.
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);
const SOC_OPTIONS = Array.from({ length: 20 }, (_, i) => String((i + 1) * 5));
const RATE_OPTIONS = Array.from({ length: 20 }, (_, i) => String((i + 1) * 5));

const selectClass =
  "bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 appearance-none text-center w-full";

const minuteOptions = (current: string) => {
  const opts = MINUTES.includes(current)
    ? MINUTES
    : [...MINUTES, current].sort((a, b) => Number(a) - Number(b));
  return opts;
};

// "18:00", "19:00" → the form's slot.
const timeToSlot = (start: string, end: string): SlotState => {
  const [startHour, startMin] = start.split(":");
  const [endHour, endMin] = end.split(":");
  return { startHour, startMin, endHour, endMin };
};

export {
  HOURS,
  MINUTES,
  SOC_OPTIONS,
  RATE_OPTIONS,
  timeToSlot,
  selectClass,
  minuteOptions,
};
