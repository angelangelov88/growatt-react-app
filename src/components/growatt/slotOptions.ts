import type { SlotState } from "./useSlotForm";

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

type Preset = "high" | "low";
const PRESETS: Record<
  Preset,
  {
    powerRate: string;
    stopSOC: string;
    label: string;
    desc: string;
    defaultSlot: SlotState;
  }
> = {
  high: {
    powerRate: "95",
    stopSOC: "20",
    label: "High Export",
    desc: "95% · stop at 20% battery",
    defaultSlot: {
      startHour: "20",
      startMin: "00",
      endHour: "21",
      endMin: "00",
    },
  },
  low: {
    powerRate: "60",
    stopSOC: "15",
    label: "Low Export",
    desc: "60% · stop at 15% battery",
    defaultSlot: {
      startHour: "20",
      startMin: "00",
      endHour: "21",
      endMin: "00",
    },
  },
};

export type { Preset };
export {
  HOURS,
  MINUTES,
  SOC_OPTIONS,
  RATE_OPTIONS,
  PRESETS,
  selectClass,
  minuteOptions,
};
