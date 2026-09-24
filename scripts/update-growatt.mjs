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

const isAlreadyDefault = (periods) => {
  const p = periods;
  return (
    p.powerRate === 35 &&
    p.stopSOC === 95 &&
    p.period1.start === "01:01" && p.period1.end === "05:00" && p.period1.enabled &&
    !p.period2.enabled && !p.period3.enabled &&
    !p.period4.enabled && !p.period5.enabled && !p.period6.enabled
  );
};

const decodeTime = (n) => {
  const h = Math.floor(n / 256);
  const m = n % 256;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const fetchChargePeriods = async (serial) => {
  const data1 = await growattRequest("/tcpSet.do", {
    action: "readMixParam",
    paramId: "mix_ac_charge_time_multi",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const data2 = await growattRequest("/tcpSet.do", {
    action: "readMixParam",
    paramId: "mix_ac_charge_time_multi_1",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  const v1 = (data1.msg ?? "").split("-").filter((s) => s !== "").map(Number);
  const v2 = (data2.msg ?? "").split("-").filter((s) => s !== "").map(Number);
  const safe = (v, offset) =>
    v[offset] !== undefined
      ? { start: decodeTime(v[offset]), end: decodeTime(v[offset + 1]), enabled: v[offset + 2] === 1 }
      : { start: "00:00", end: "00:00", enabled: false };
  return {
    powerRate: v1[0] ?? NaN,
    stopSOC: v1[1] ?? NaN,
    period1: safe(v1, 10),
    period2: safe(v1, 13),
    period3: safe(v1, 16),
    period4: safe(v2, 0),
    period5: safe(v2, 3),
    period6: safe(v2, 6),
  };
};

const slotParams46 = (p4, p5, p6) => ({
  param1:  p4?.startHour ?? "00", param2:  p4?.startMin  ?? "00",
  param3:  p4?.endHour   ?? "00", param4:  p4?.endMin    ?? "00", param5:  p4 ? "1" : "0",
  param6:  p5?.startHour ?? "00", param7:  p5?.startMin  ?? "00",
  param8:  p5?.endHour   ?? "00", param9:  p5?.endMin    ?? "00", param10: p5 ? "1" : "0",
  param11: p6?.startHour ?? "00", param12: p6?.startMin  ?? "00",
  param13: p6?.endHour   ?? "00", param14: p6?.endMin    ?? "00", param15: p6 ? "1" : "0",
});

const applyDefaultPeriods = async (serial) => {
  const data1 = await growattRequest("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_period",
    param1: "35", param2: "95", param3: "1",
    param4: "01", param5: "01", param6: "05", param7: "00", param8: "1",
    param9: "00", param10: "00", param11: "00", param12: "00", param13: "0",
    param14: "00", param15: "00", param16: "00", param17: "00", param18: "0",
  });
  console.log("Growatt set defaults (1-3) response:", JSON.stringify(data1));
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const data2 = await growattRequest("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_multi_1",
    ...slotParams46(null, null, null),
  });
  console.log("Growatt set defaults (4-6) response:", JSON.stringify(data2));
};

const toParam = (slot) => {
  const end = new Date(slot.endDt);
  return {
    startHour: String(start.getHours()).padStart(2, "0"),
    startMin: String(start.getMinutes()).padStart(2, "0"),
    endHour: String(end.getHours()).padStart(2, "0"),
    endMin: String(end.getMinutes()).padStart(2, "0"),
  };
};

const applyToGrowatt = async (serial, p2, p3, p4 = null, p5 = null, p6 = null) => {
  const data1 = await growattRequest("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_period",
    param1: "25", param2: "95", param3: "1",
    param4: "01", param5: "00", param6: "05", param7: "00", param8: "1",
    param9:  p2?.startHour ?? "00", param10: p2?.startMin ?? "00",
    param11: p2?.endHour   ?? "00", param12: p2?.endMin   ?? "00", param13: p2 ? "1" : "0",
    param14: p3?.startHour ?? "00", param15: p3?.startMin ?? "00",
    param16: p3?.endHour   ?? "00", param17: p3?.endMin   ?? "00", param18: p3 ? "1" : "0",
  });
  console.log("Growatt set periods (1-3) response:", JSON.stringify(data1));
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const data2 = await growattRequest("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_multi_1",
    ...slotParams46(p4, p5, p6),
  });
  console.log("Growatt set periods (4-6) response:", JSON.stringify(data2));
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
    console.log("No upcoming slots — checking if defaults need applying...");
    await growattLogin();
    const plantId = await fetchPlantId();
    const serial = await fetchSerial(plantId);
    const current = await fetchChargePeriods(serial);
    if (isAlreadyDefault(current)) {
      console.log("Already at default settings — nothing to do");
    } else {
      console.log("Applying default settings...");
      await applyDefaultPeriods(serial);
    }
    return;
  }

  console.log(`Found ${upcoming.length} upcoming slot(s)`);
  if (upcoming.length > 5) {
    console.log(`Warning: ${upcoming.length - 5} slot(s) not applied (max 5 periods available)`);
  }

  const p2 = upcoming[0] ? toParam(upcoming[0]) : null;
  const p3 = upcoming[1] ? toParam(upcoming[1]) : null;
  const p4 = upcoming[2] ? toParam(upcoming[2]) : null;
  const p5 = upcoming[3] ? toParam(upcoming[3]) : null;
  const p6 = upcoming[4] ? toParam(upcoming[4]) : null;

  console.log("Logging into Growatt...");
  await growattLogin();

  const plantId = await fetchPlantId();
  const serial = await fetchSerial(plantId);

  console.log(`Applying slots to serial ${serial}...`);
  await applyToGrowatt(serial, p2, p3, p4, p5, p6);
  console.log("Done");
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
