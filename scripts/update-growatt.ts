import { createGrowattClient, type ChargePeriods } from "../src/components/growatt/growattApi";

const GROWATT_BASE = "https://server.growatt.com";
const OCTOPUS_ENDPOINT = "https://api.octopus.energy/v1/graphql/";

const {
  GROWATT_USER = "",
  GROWATT_PASSWORD = "",
  GROWATT_SERIAL = "",
  OCTOPUS_API_KEY = "",
  OCTOPUS_ACCOUNT = "",
} = process.env;

const growatt = createGrowattClient({
  user: GROWATT_USER,
  password: GROWATT_PASSWORD,
  buildUrl: (path) => `${GROWATT_BASE}${path}`,
});

// ─── Octopus ──────────────────────────────────────────────────────────────────

const octopusAuth = async () => {
  const res = await fetch(OCTOPUS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation { obtainKrakenToken(input: { APIKey: "${OCTOPUS_API_KEY}" }) { token } }`,
    }),
  });
  const json = await res.json() as any;
  const token = json?.data?.obtainKrakenToken?.token;
  if (!token) throw new Error("Octopus auth failed");
  return token as string;
};

const fetchSlots = async (token: string) => {
  const res = await fetch(OCTOPUS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      query: `query { plannedDispatches(accountNumber: "${OCTOPUS_ACCOUNT}") { startDt endDt } }`,
    }),
  });
  const json = await res.json() as any;
  return (json?.data?.plannedDispatches ?? []) as { startDt: string; endDt: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toParam = (slot: { startDt: string; endDt: string }) => {
  const start = new Date(slot.startDt);
  const end = new Date(slot.endDt);
  return {
    startHour: String(start.getHours()).padStart(2, "0"),
    startMin:  String(start.getMinutes()).padStart(2, "0"),
    endHour:   String(end.getHours()).padStart(2, "0"),
    endMin:    String(end.getMinutes()).padStart(2, "0"),
  };
};

type Param = { startHour: string; startMin: string; endHour: string; endMin: string };

const periodTime = (p: Param) => `${p.startHour}:${p.startMin}`;
const periodEnd  = (p: Param) => `${p.endHour}:${p.endMin}`;

const isAlreadyDefault = (p: ChargePeriods) =>
  p.powerRate === 35 &&
  p.stopSOC === 95 &&
  p.period1.start === "01:00" && p.period1.end === "05:00" && p.period1.enabled &&
  !p.period2.enabled && !p.period3.enabled &&
  !p.period4.enabled && !p.period5.enabled && !p.period6.enabled;

const slotsMatch = (p: ChargePeriods, fixed: Param, extras: (Param | null)[]) => {
  if (p.powerRate !== 25 || p.stopSOC !== 95) return false;
  if (!p.period1.enabled || p.period1.start !== periodTime(fixed) || p.period1.end !== periodEnd(fixed)) return false;
  const periods = [p.period2, p.period3, p.period4, p.period5, p.period6];
  return extras.every((slot, i) => {
    const period = periods[i];
    if (!slot) return !period.enabled;
    return period.enabled && period.start === periodTime(slot) && period.end === periodEnd(slot);
  });
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  console.log("Fetching Octopus slots...");
  const token = await octopusAuth();
  const allSlots = await fetchSlots(token);

  const now = new Date();
  const upcoming = allSlots.filter((s) => new Date(s.endDt) > now);

  if (upcoming.length === 0) {
    console.log("No upcoming slots — checking if defaults need applying...");
    const current = await growatt.fetchChargePeriods(GROWATT_SERIAL);
    if (isAlreadyDefault(current)) {
      console.log("Already at default settings — nothing to do");
    } else {
      console.log("Applying default settings...");
      await growatt.setDefaultPeriods(GROWATT_SERIAL);
      console.log("Done");
    }
    return;
  }

  console.log(`Found ${upcoming.length} upcoming slot(s)`);
  if (upcoming.length > 5) {
    console.log(`Warning: ${upcoming.length - 5} slot(s) not applied (max 5 extra periods)`);
  }

  const fixed: Param = { startHour: "01", startMin: "00", endHour: "05", endMin: "00" };
  const [s1, s2, s3, s4, s5] = upcoming.map(toParam);
  const extras: (Param | null)[] = [s1 ?? null, s2 ?? null, s3 ?? null, s4 ?? null, s5 ?? null];

  const current = await growatt.fetchChargePeriods(GROWATT_SERIAL);
  if (slotsMatch(current, fixed, extras)) {
    console.log("Growatt already matches upcoming slots — nothing to do");
    return;
  }

  console.log("Applying slots to Growatt...");
  await growatt.setChargePeriods(GROWATT_SERIAL, "25", "95", fixed, ...extras);
  console.log("Done");
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
