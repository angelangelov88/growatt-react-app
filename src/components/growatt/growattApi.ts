const BASE = "/growatt";

const headers = {
  token: import.meta.env.VITE_GROWATT_TOKEN,
  "Content-Type": "application/x-www-form-urlencoded",
};

const get = async (path: string, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${BASE}${path}`, { headers });
    const data = await res.json();
    console.log('data', data);
    if (data.error_code === 10012) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }
    if (data.error_code !== 0) throw new Error(data.error_msg);
    return data.data;
  }
  throw new Error("Rate limited after retries");
};

const post = async (path: string, body: Record<string, string>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers,
      body: new URLSearchParams(body),
    });
    const data = await res.json();
    if (data.error_code === 10012) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }
    if (data.error_code !== 0) throw new Error(data.error_msg);
    return data.data;
  }
  throw new Error("Rate limited after retries");
};

export const fetchUserInfo = () => get("/v1/user/info");

export const fetchDeviceList = () => get("/v1/device/list?page=1");

export const setChargeTime = (
  serial: string,
  startHour: string,
  startMin: string,
  endHour: string,
  endMin: string,
) =>
  post("/v1/device/mix/set_mix_ac_charge_time_period", {
    serialNum: serial,
    param1: "25",
    param2: "95",
    param3: "1",
    param4: startHour,
    param5: startMin,
    param6: endHour,
    param7: endMin,
    param8: "1",
    param9: "00",
    param10: "00",
    param11: "00",
    param12: "00",
    param13: "0",
    param14: "00",
    param15: "00",
    param16: "00",
    param17: "00",
    param18: "0",
  });
