// Growatt inverter types. Kept free of React: the GitHub Action imports them.

type SlotParam = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
} | null;

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
  cookieHeader?: string; // defaults to "Cookie"; use "X-Session-Cookie" for browser proxy
  // Where to keep the Growatt session between page loads. Browser only.
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
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
  ChargePeriod,
  ChargePeriods,
  DischargePeriods,
  GrowattResponse,
  GrowattConfig,
  SlotState,
  Snapshot,
  Preset,
};
