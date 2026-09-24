import SparkMD5 from "spark-md5";

const hashPassword = (password: string) => SparkMD5.hash(password);

let sessionCookie = "";
let loginPromise: Promise<void> | null = null;

const ensureLoggedIn = () => {
  if (sessionCookie) return Promise.resolve();
  if (!loginPromise) {
    loginPromise = request("/login", {
      account: import.meta.env.VITE_GROWATT_USER,
      password: "",
      passwordCrc: hashPassword(import.meta.env.VITE_GROWATT_PASSWORD),
      validateCode: "",
      isReadPact: "0",
      type: "1",
    }).then((data) => {
      loginPromise = null;
      if (data.result !== 1) throw new Error(data.msg ?? "Login failed");
    }).catch((err) => {
      loginPromise = null;
      throw err;
    });
  }
  return loginPromise;
};

const buildUrl = (path: string) => {
  if (import.meta.env.DEV) return `/growatt${path}`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/api/growatt?path=${encodeURIComponent(cleanPath)}`;
};

const request = async (
  path: string,
  body?: Record<string, string>,
): Promise<any> => {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (sessionCookie) headers["X-Session-Cookie"] = sessionCookie;

  const res = await fetch(buildUrl(path), {
    method: body ? "POST" : "GET",
    headers,
    body: body ? new URLSearchParams(body) : undefined,
  });

  // Capture session cookie from login response
  const setCookie = res.headers.get("x-set-cookie") ?? res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/JSESSIONID=[^;]+/);
    if (match) sessionCookie = match[0];
  }

  const text = await res.text();
  console.log(`${body ? "POST" : "GET"} ${path}:`, text);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
  }
};

export const fetchPlantList = async () => { await ensureLoggedIn(); return request("/index/getPlantListTitle?currPage=1"); };
export const fetchPlantData = async (plantId: string) => { await ensureLoggedIn(); return request("/panel/getPlantData", { plantId }); };
export const fetchDevicesByPlant = async (plantId: string) => { await ensureLoggedIn(); return request("/device/getDevicesByPlantList", { plantId, currPage: "1" }); };

export type SlotParam = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
} | null;

export type ChargePeriod = { start: string; end: string; enabled: boolean };
export type DischargePeriods = {
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
export type ChargePeriods = {
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

export const fetchChargePeriods = async (
  serial: string,
): Promise<ChargePeriods> => {
  await ensureLoggedIn();
  const data1 = await request("/tcpSet.do", {
    action: "readMixParam",
    paramId: "mix_ac_charge_time_multi",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const data2 = await request("/tcpSet.do", {
    action: "readMixParam",
    paramId: "mix_ac_charge_time_multi_1",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  const raw1 = (data1.msg ?? "") as string;
  const raw2 = (data2.msg ?? "") as string;
  const v1 = raw1.split("-").filter((s: string) => s !== "").map(Number);
  const v2 = raw2.split("-").filter((s: string) => s !== "").map(Number);
  const decodeTime = (n: number) => {
    const h = Math.floor(n / 256);
    const m = n % 256;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const safe = (v: number[], offset: number): ChargePeriod =>
    v[offset] !== undefined
      ? { start: decodeTime(v[offset]), end: decodeTime(v[offset + 1]), enabled: v[offset + 2] === 1 }
      : { start: "--", end: "--", enabled: false };
  // mix_ac_charge_time_multi: powerRate=v[0], SOC=v[1], periods at 10/13/16 (start,end,enabled)
  // mix_ac_charge_time_multi_1: periods 4-6 at 0/3/6
  return {
    powerRate: v1[0] ?? NaN,
    stopSOC: v1[1] ?? NaN,
    raw: `[1-3]: ${raw1} | [4-6]: ${raw2}`,
    period1: safe(v1, 10),
    period2: safe(v1, 13),
    period3: safe(v1, 16),
    period4: safe(v2, 0),
    period5: safe(v2, 3),
    period6: safe(v2, 6),
  };
};

export const fetchDischargePeriods = async (
  serial: string,
): Promise<DischargePeriods> => {
  await ensureLoggedIn();
  const data1 = await request("/tcpSet.do", {
    action: "readMixParam",
    paramId: "MIX_AC_DISCHARGE_TIME_MULTI",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const data2 = await request("/tcpSet.do", {
    action: "readMixParam",
    paramId: "mix_ac_discharge_time_multi_1",
    serialNum: serial,
    startAddr: "-1",
    endAddr: "-1",
  });
  const raw1 = (data1.msg ?? "") as string;
  const raw2 = (data2.msg ?? "") as string;
  const v1 = raw1.split("-").filter((s: string) => s !== "").map(Number);
  const v2 = raw2.split("-").filter((s: string) => s !== "").map(Number);
  const decodeTime = (n: number) => {
    const h = Math.floor(n / 256);
    const m = n % 256;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const safe = (v: number[], offset: number): ChargePeriod =>
    v[offset] !== undefined
      ? { start: decodeTime(v[offset]), end: decodeTime(v[offset + 1]), enabled: v[offset + 2] === 1 }
      : { start: "--", end: "--", enabled: false };
  // MIX_AC_DISCHARGE_TIME_MULTI: powerRate=v[0], SOC=v[1], periods at 10/13/16
  // mix_ac_discharge_time_multi_1: periods 4-6 at 0/3/6
  return {
    powerRate: v1[0] ?? NaN,
    stopSOC: v1[1] ?? NaN,
    raw: `[1-3]: ${raw1} | [4-6]: ${raw2}`,
    period1: safe(v1, 10),
    period2: safe(v1, 13),
    period3: safe(v1, 16),
    period4: safe(v2, 0),
    period5: safe(v2, 3),
    period6: safe(v2, 6),
  };
};

const delay = () => new Promise((resolve) => setTimeout(resolve, 10000));

const dischargeSlotParams46 = (p4: SlotParam, p5: SlotParam, p6: SlotParam): Record<string, string> => ({
  param1:  p4?.startHour ?? "00", param2:  p4?.startMin  ?? "00",
  param3:  p4?.endHour   ?? "00", param4:  p4?.endMin    ?? "00", param5:  p4 ? "1" : "0",
  param6:  p5?.startHour ?? "00", param7:  p5?.startMin  ?? "00",
  param8:  p5?.endHour   ?? "00", param9:  p5?.endMin    ?? "00", param10: p5 ? "1" : "0",
  param11: p6?.startHour ?? "00", param12: p6?.startMin  ?? "00",
  param13: p6?.endHour   ?? "00", param14: p6?.endMin    ?? "00", param15: p6 ? "1" : "0",
});

export const disableAllDischargePeriods = async (serial: string) => {
  await ensureLoggedIn();
  await request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_discharge_time_period",
    param1: "95", param2: "20",
    param3: "00", param4: "00", param5: "00", param6: "00", param7: "0",
    param8: "00", param9: "00", param10: "00", param11: "00", param12: "0",
    param13: "00", param14: "00", param15: "00", param16: "00", param17: "0",
  });
  await delay();
  return request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_discharge_time_multi_1",
    ...dischargeSlotParams46(null, null, null),
  });
};

export const setDischargePeriods = async (
  serial: string,
  powerRate: string,
  stopSOC: string,
  p1: SlotParam,
  p2: SlotParam = null, p3: SlotParam = null,
  p4: SlotParam = null, p5: SlotParam = null, p6: SlotParam = null,
) => {
  await ensureLoggedIn();
  await request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_discharge_time_period",
    param1: powerRate, param2: stopSOC,
    param3:  p1?.startHour ?? "00", param4:  p1?.startMin ?? "00",
    param5:  p1?.endHour   ?? "00", param6:  p1?.endMin   ?? "00", param7:  p1 ? "1" : "0",
    param8:  p2?.startHour ?? "00", param9:  p2?.startMin ?? "00",
    param10: p2?.endHour   ?? "00", param11: p2?.endMin   ?? "00", param12: p2 ? "1" : "0",
    param13: p3?.startHour ?? "00", param14: p3?.startMin ?? "00",
    param15: p3?.endHour   ?? "00", param16: p3?.endMin   ?? "00", param17: p3 ? "1" : "0",
  });
  await delay();
  return request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_discharge_time_multi_1",
    ...dischargeSlotParams46(p4, p5, p6),
  });
};

const slotParams46 = (p4: SlotParam, p5: SlotParam, p6: SlotParam): Record<string, string> => ({
  param1:  p4?.startHour ?? "00", param2:  p4?.startMin  ?? "00",
  param3:  p4?.endHour   ?? "00", param4:  p4?.endMin    ?? "00", param5:  p4 ? "1" : "0",
  param6:  p5?.startHour ?? "00", param7:  p5?.startMin  ?? "00",
  param8:  p5?.endHour   ?? "00", param9:  p5?.endMin    ?? "00", param10: p5 ? "1" : "0",
  param11: p6?.startHour ?? "00", param12: p6?.startMin  ?? "00",
  param13: p6?.endHour   ?? "00", param14: p6?.endMin    ?? "00", param15: p6 ? "1" : "0",
});

export const setDefaultPeriods = async (serial: string) => {
  await ensureLoggedIn();
  await request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_period",
    param1: "35", param2: "95", param3: "1",
    param4: "01", param5: "01", param6: "05", param7: "00", param8: "1",
    param9: "00", param10: "00", param11: "00", param12: "00", param13: "0",
    param14: "00", param15: "00", param16: "00", param17: "00", param18: "0",
  });
  await delay();
  return request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_multi_1",
    ...slotParams46(null, null, null),
  });
};

export const setChargePeriods = async (
  serial: string,
  powerRate: string,
  stopSOC: string,
  p1: SlotParam,
  p2: SlotParam = null, p3: SlotParam = null,
  p4: SlotParam = null, p5: SlotParam = null, p6: SlotParam = null,
) => {
  await ensureLoggedIn();
  await request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_period",
    param1: powerRate, param2: stopSOC, param3: "1",
    param4:  p1?.startHour ?? "00", param5:  p1?.startMin ?? "00",
    param6:  p1?.endHour   ?? "00", param7:  p1?.endMin   ?? "00", param8:  p1 ? "1" : "0",
    param9:  p2?.startHour ?? "00", param10: p2?.startMin ?? "00",
    param11: p2?.endHour   ?? "00", param12: p2?.endMin   ?? "00", param13: p2 ? "1" : "0",
    param14: p3?.startHour ?? "00", param15: p3?.startMin ?? "00",
    param16: p3?.endHour   ?? "00", param17: p3?.endMin   ?? "00", param18: p3 ? "1" : "0",
  });
  await delay();
  return request("/tcpSet.do", {
    action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_multi_1",
    ...slotParams46(p4, p5, p6),
  });
};
