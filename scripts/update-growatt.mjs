// @ts-check
import SparkMD5 from "spark-md5";

const GROWATT_BASE = "https://server.growatt.com";
const OCTOPUS_ENDPOINT = "https://api.octopus.energy/v1/graphql/";

const {
  GROWATT_USER,
  GROWATT_PASSWORD,
  GROWATT_SERIAL,
  OCTOPUS_API_KEY,
  OCTOPUS_ACCOUNT,
} = process.env;

// --- Growatt ---

let growattCookies = "";

const growattRequest = async (path, body) => {
  const res = await fetch(`${GROWATT_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(growattCookies ? { Cookie: growattCookies } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    growattCookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  }

  return res.json();
};

const growattLogin = async () => {
  const data = await growattRequest("/login", {
    account: GROWATT_USER,
    password: "",
    passwordCrc: SparkMD5.hash(GROWATT_PASSWORD),
    validateCode: "",
    isReadPact: "0",
    type: "1",
  });
  if (data.result !== 1) throw new Error(`Growatt login failed: ${data.msg}`);
  console.log("Growatt login OK");
};

const fetchPlantId = async () => {
  const data = await growattRequest("/index/getPlantListTitle?currPage=1");
  const plant = data?.data?.[0];
  const id = plant?.id ?? plant?.plantId;
  if (!id) throw new Error("No plant found");
  return id;
};

const fetchSerial = async (plantId) => {
  const data = await growattRequest("/device/getDevicesByPlantList", {
    plantId,
    currPage: "1",
  });
  const device = data?.obj?.datas?.[0];
  const serial = device?.sn ?? device?.serialNum ?? GROWATT_SERIAL;
  if (!serial) throw new Error("No device serial found");
  return serial;
};

const toParam = (slot) => {
  const start = new Date(slot.startDt);
  const end = new Date(slot.endDt);
  return {
    startHour: String(start.getHours()).padStart(2, "0"),
    startMin: String(start.getMinutes()).padStart(2, "0"),
    endHour: String(end.getHours()).padStart(2, "0"),
    endMin: String(end.getMinutes()).padStart(2, "0"),
  };
};

const applyToGrowatt = async (serial, p2, p3) => {
  const data = await growattRequest("/tcpSet.do", {
    action: "mixSet",
    serialNum: serial,
    type: "mix_ac_charge_time_period",
    param1: "25", param2: "95", param3: "1",
    param4: "01", param5: "00", param6: "05", param7: "00", param8: "1",
    param9:  p2?.startHour ?? "00",
    param10: p2?.startMin  ?? "00",
    param11: p2?.endHour   ?? "00",
    param12: p2?.endMin    ?? "00",
    param13: p2 ? "1" : "0",
    param14: p3?.startHour ?? "00",
    param15: p3?.startMin  ?? "00",
    param16: p3?.endHour   ?? "00",
    param17: p3?.endMin    ?? "00",
    param18: p3 ? "1" : "0",
  });
  console.log("Growatt set charge periods response:", JSON.stringify(data));
};

// --- Octopus ---

const octopusAuth = async () => {
  const res = await fetch(OCTOPUS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation { obtainKrakenToken(input: { APIKey: "${OCTOPUS_API_KEY}" }) { token } }`,
    }),
  });
  const json = await res.json();
  const token = json?.data?.obtainKrakenToken?.token;
  if (!token) throw new Error("Octopus auth failed");
  return token;
};

const fetchSlots = async (token) => {
  const res = await fetch(OCTOPUS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      query: `query { plannedDispatches(accountNumber: "${OCTOPUS_ACCOUNT}") { startDt endDt } }`,
    }),
  });
  const json = await res.json();
  return json?.data?.plannedDispatches ?? [];
};

// --- Main ---

const run = async () => {
  console.log("Fetching Octopus slots...");
  const token = await octopusAuth();
  const allSlots = await fetchSlots(token);

  const now = new Date();
  const upcoming = allSlots.filter((s) => new Date(s.endDt) > now);

  if (upcoming.length === 0) {
    console.log("No upcoming slots — nothing to do");
    return;
  }

  console.log(`Found ${upcoming.length} upcoming slot(s)`);
  if (upcoming.length > 2) {
    console.log(`Warning: ${upcoming.length - 2} slot(s) not applied (only 2 periods available)`);
  }

  const p2 = toParam(upcoming[0]);
  const p3 = upcoming[1] ? toParam(upcoming[1]) : null;

  console.log("Logging into Growatt...");
  await growattLogin();

  const plantId = await fetchPlantId();
  const serial = await fetchSerial(plantId);

  console.log(`Applying slots to serial ${serial}...`);
  await applyToGrowatt(serial, p2, p3);
  console.log("Done");
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
