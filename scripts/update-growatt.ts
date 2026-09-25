import { createGrowattClient } from "../src/components/growatt/growattApi";
import {
  buildChargePlan,
  describePlan,
  planMatches,
} from "../src/components/octopus/chargePlan";

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
  const json = (await res.json()) as any;
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
  const json = (await res.json()) as any;
  return (json?.data?.plannedDispatches ?? []) as {
    startDt: string;
    endDt: string;
  }[];
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  console.log("Fetching Octopus slots...");
  const token = await octopusAuth();
  const dispatches = await fetchSlots(token);

  const plan = buildChargePlan(dispatches);
  console.log(`Plan (UK time): ${describePlan(plan)}`);
  if (plan.skipped) {
    console.log(
      `Warning: ${plan.skipped} Octopus period(s) not applied — the inverter only has 6 slots`,
    );
  }

  const current = await growatt.fetchChargePeriods(GROWATT_SERIAL);
  if (planMatches(plan, current)) {
    console.log("Growatt already matches the plan — nothing to do");
    return;
  }

  console.log("Applying plan to Growatt...");
  await growatt.setChargePeriods(
    GROWATT_SERIAL,
    plan.powerRate,
    plan.stopSOC,
    ...plan.slots,
  );
  console.log("Done");
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
