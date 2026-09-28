// Growatt inverter types. Kept free of React: the server imports them.

type SlotParam = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
} | null;

// Battery First or Grid First values to write, as the forms hold them. Empty
// slots are null.
type PeriodsInput = { powerRate: string; stopSOC: string; slots: SlotParam[] };

type ChargePeriod = { start: string; end: string; enabled: boolean };
type ChargePeriods = {
  powerRate: number;
  stopSOC: number;
  raw: string;
  period1: ChargePeriod;
  period2: ChargePeriod;
  period3: ChargePeriod;
  period4: ChargePeriod;
  period5: ChargePeriod;
  period6: ChargePeriod;
};
type DischargePeriods = ChargePeriods;

// The fields of a Growatt JSON reply that this client reads.
type GrowattResponse = {
  success?: boolean;
  msg?: string;
  result?: number;
};

type GrowattConfig = {
  user: string;
  // MD5 of the password, which is all Growatt's login sends.
  passwordMd5: string;
  buildUrl: (path: string) => string;
  // Log each reply (never the login one).
  debug?: boolean;
};

// A slot as edited in the form.
type SlotState = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
};

type Snapshot = { powerRate: string; stopSOC: string; slots: SlotState[] };

type Preset = "high" | "low";

export type {
  SlotParam,
  PeriodsInput,
  ChargePeriod,
  ChargePeriods,
  DischargePeriods,
  GrowattResponse,
  GrowattConfig,
  SlotState,
  Snapshot,
  Preset,
};
