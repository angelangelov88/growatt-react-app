import SparkMD5 from "spark-md5";

const BASE = "/growatt";

const hashPassword = (password: string) => SparkMD5.hash(password);

const request = async (path: string, body?: Record<string, string>): Promise<any> => {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    credentials: "include",
    headers: body ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: body ? new URLSearchParams(body) : undefined,
  });
  const text = await res.text();
  console.log(`${body ? "POST" : "GET"} ${path}:`, text);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
  }
};

export const login = async (user: string, password: string) => {
  const data = await request("/login", {
    account: user,
    password: "",
    passwordCrc: hashPassword(password),
    validateCode: "",
    isReadPact: "0",
    type: "1",
  });
  if (data.result !== 1) throw new Error(data.msg ?? "Login failed");
  return data;
};

export const fetchPlantList = () =>
  request("/index/getPlantListTitle?currPage=1");

export const fetchPlantData = (plantId: string) =>
  request("/panel/getPlantData", { plantId });

export const fetchDevicesByPlant = (plantId: string) =>
  request("/device/getDevicesByPlantList", { plantId, currPage: "1" });

export const setChargeTime = (
  serial: string,
  startHour: string,
  startMin: string,
  endHour: string,
  endMin: string,
  period: 2 | 3 = 2,
) => {
  const isP2 = period === 2;
  return request("/tcpSet.do", {
    action: "mixSet",
    serialNum: serial,
    type: "mix_ac_charge_time_period",
    param1: "25",
    param2: "95",
    param3: "1",
    // period 1 — hardcoded 01:00–05:00 enabled
    param4: "01",
    param5: "00",
    param6: "05",
    param7: "00",
    param8: "1",
    // period 2
    param9:  isP2 ? startHour : "00",
    param10: isP2 ? startMin  : "00",
    param11: isP2 ? endHour   : "00",
    param12: isP2 ? endMin    : "00",
    param13: isP2 ? "1"       : "0",
    // period 3
    param14: isP2 ? "00"      : startHour,
    param15: isP2 ? "00"      : startMin,
    param16: isP2 ? "00"      : endHour,
    param17: isP2 ? "00"      : endMin,
    param18: isP2 ? "0"       : "1",
  });
};
