import SparkMD5 from "spark-md5";

export type SlotParam = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
} | null;

export type ChargePeriod = { start: string; end: string; enabled: boolean };
export type ChargePeriods = {
  powerRate: number;
  stopSOC: number;
  raw: string;
  period1: ChargePeriod; period2: ChargePeriod; period3: ChargePeriod;
  period4: ChargePeriod; period5: ChargePeriod; period6: ChargePeriod;
};
export type DischargePeriods = ChargePeriods;

// ─── Factory ──────────────────────────────────────────────────────────────────
// Used by the Node script (passes process.env values + direct Growatt URL).
// Used by the browser (passes Vite env values + proxy URL builder).

export type GrowattConfig = {
  user: string;
  password: string;
  buildUrl: (path: string) => string;
  cookieHeader?: string; // defaults to "Cookie"; use "X-Session-Cookie" for browser proxy
};

export const createGrowattClient = ({ user, password, buildUrl, cookieHeader = "Cookie" }: GrowattConfig) => {
  const STORAGE_KEY = "growatt_session";
  let sessionCookie = sessionStorage.getItem(STORAGE_KEY) ?? "";
  let loginPromise: Promise<void> | null = null;

  const request = async (path: string, body?: Record<string, string>, isRetry = false): Promise<any> => {
    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (sessionCookie) headers[cookieHeader] = sessionCookie;

    const res = await fetch(buildUrl(path), {
      method: body ? "POST" : "GET",
      headers,
      body: body ? new URLSearchParams(body) : undefined,
    });

    const setCookie = res.headers.get("x-set-cookie") ?? res.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/JSESSIONID=[^;]+/);
      if (match) {
        sessionCookie = match[0];
        sessionStorage.setItem(STORAGE_KEY, sessionCookie);
      }
    }

    const text = await res.text();
    console.log(`${body ? "POST" : "GET"} ${path}:`, text);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
    }

    // Detect session expiry and retry once
    const isAuthError = json?.success === false && typeof json?.msg === "string" &&
      (json.msg.toLowerCase().includes("login") || json.msg.toLowerCase().includes("session"));

    if (!isRetry && isAuthError) {
      sessionCookie = "";
      sessionStorage.removeItem(STORAGE_KEY);
      loginPromise = null;
      await ensureLoggedIn();
      return request(path, body, true);
    }

    if (isAuthError) throw new Error(json.msg);

    if (json?.success === false) throw new Error(json?.msg ?? "Request failed");

    return json;
  };

  const ensureLoggedIn = () => {
    if (sessionCookie) return Promise.resolve();
    if (!loginPromise) {
      loginPromise = request("/login", {
        account: user,
        password: "",
        passwordCrc: SparkMD5.hash(password),
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

  const readDelay  = () => new Promise((resolve) => setTimeout(resolve, 1000));
  const writeDelay = () => new Promise((resolve) => setTimeout(resolve, 10000));

  const decodeTime = (n: number) => {
    const h = Math.floor(n / 256);
    const m = n % 256;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const safe = (v: number[], offset: number): ChargePeriod =>
    v[offset] !== undefined
      ? { start: decodeTime(v[offset]), end: decodeTime(v[offset + 1]), enabled: v[offset + 2] === 1 }
      : { start: "--", end: "--", enabled: false };

  const slotParams46 = (p4: SlotParam, p5: SlotParam, p6: SlotParam): Record<string, string> => ({
    param1:  p4?.startHour ?? "00", param2:  p4?.startMin  ?? "00",
    param3:  p4?.endHour   ?? "00", param4:  p4?.endMin    ?? "00", param5:  p4 ? "1" : "0",
    param6:  p5?.startHour ?? "00", param7:  p5?.startMin  ?? "00",
    param8:  p5?.endHour   ?? "00", param9:  p5?.endMin    ?? "00", param10: p5 ? "1" : "0",
    param11: p6?.startHour ?? "00", param12: p6?.startMin  ?? "00",
    param13: p6?.endHour   ?? "00", param14: p6?.endMin    ?? "00", param15: p6 ? "1" : "0",
  });

  return {
    fetchChargePeriods: async (serial: string): Promise<ChargePeriods> => {
      await ensureLoggedIn();
      const data1 = await request("/tcpSet.do", { action: "readMixParam", paramId: "mix_ac_charge_time_multi", serialNum: serial, startAddr: "-1", endAddr: "-1" });
      const v1 = ((data1.msg ?? "") as string).split("-").filter(Boolean).map(Number);
      const p1 = safe(v1, 10), p2 = safe(v1, 13), p3 = safe(v1, 16);
      const hasMore = p1.enabled && p2.enabled && p3.enabled;
      let v2: number[] = [];
      if (hasMore) {
        await readDelay();
        const data2 = await request("/tcpSet.do", { action: "readMixParam", paramId: "mix_ac_charge_time_multi_1", serialNum: serial, startAddr: "-1", endAddr: "-1" });
        v2 = ((data2.msg ?? "") as string).split("-").filter(Boolean).map(Number);
      }
      return {
        powerRate: v1[0] ?? NaN, stopSOC: v1[1] ?? NaN,
        raw: `[1-3]: ${data1.msg}`,
        period1: p1, period2: p2, period3: p3,
        period4: safe(v2, 0), period5: safe(v2, 3), period6: safe(v2, 6),
      };
    },

    fetchDischargePeriods: async (serial: string): Promise<DischargePeriods> => {
      await ensureLoggedIn();
      const data1 = await request("/tcpSet.do", { action: "readMixParam", paramId: "MIX_AC_DISCHARGE_TIME_MULTI", serialNum: serial, startAddr: "-1", endAddr: "-1" });
      const v1 = ((data1.msg ?? "") as string).split("-").filter(Boolean).map(Number);
      const p1 = safe(v1, 10), p2 = safe(v1, 13), p3 = safe(v1, 16);
      const hasMore = p1.enabled && p2.enabled && p3.enabled;
      let v2: number[] = [];
      if (hasMore) {
        await readDelay();
        const data2 = await request("/tcpSet.do", { action: "readMixParam", paramId: "mix_ac_discharge_time_multi_1", serialNum: serial, startAddr: "-1", endAddr: "-1" });
        v2 = ((data2.msg ?? "") as string).split("-").filter(Boolean).map(Number);
      }
      return {
        powerRate: v1[0] ?? NaN, stopSOC: v1[1] ?? NaN,
        raw: `[1-3]: ${data1.msg}`,
        period1: p1, period2: p2, period3: p3,
        period4: safe(v2, 0), period5: safe(v2, 3), period6: safe(v2, 6),
      };
    },

    setChargePeriods: async (serial: string, powerRate: string, stopSOC: string, p1: SlotParam, p2: SlotParam = null, p3: SlotParam = null, p4: SlotParam = null, p5: SlotParam = null, p6: SlotParam = null) => {
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
      if (!p4 && !p5 && !p6) return;
      await writeDelay();
      return request("/tcpSet.do", { action: "mixSet", serialNum: serial, type: "mix_ac_charge_time_multi_1", ...slotParams46(p4, p5, p6) });
    },

    setDischargePeriods: async (serial: string, powerRate: string, stopSOC: string, p1: SlotParam, p2: SlotParam = null, p3: SlotParam = null, p4: SlotParam = null, p5: SlotParam = null, p6: SlotParam = null) => {
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
      if (!p4 && !p5 && !p6) return;
      await writeDelay();
      return request("/tcpSet.do", { action: "mixSet", serialNum: serial, type: "mix_ac_discharge_time_multi_1", ...slotParams46(p4, p5, p6) });
    },
  };
};

// ─── Browser singleton ────────────────────────────────────────────────────────
// The browser cannot set the Cookie header directly (forbidden header).
// Instead we store the session cookie in memory and send it via X-Session-Cookie,
// which the Vercel proxy reads and forwards as Cookie to Growatt.

let _client: ReturnType<typeof createGrowattClient> | null = null;

const browserClient = () => {
  if (!_client) {
    _client = createGrowattClient({
      user: import.meta.env.VITE_GROWATT_USER,
      password: import.meta.env.VITE_GROWATT_PASSWORD,
      cookieHeader: "X-Session-Cookie",
      buildUrl: (path) => {
        if (import.meta.env.DEV) return `/growatt${path}`;
        const clean = path.startsWith("/") ? path.slice(1) : path;
        return `/api/growatt?path=${encodeURIComponent(clean)}`;
      },
    });
  }
  return _client;
};

export const fetchChargePeriods    = (serial: string) => browserClient().fetchChargePeriods(serial);
export const fetchDischargePeriods = (serial: string) => browserClient().fetchDischargePeriods(serial);
export const setChargePeriods      = (serial: string, powerRate: string, stopSOC: string, p1: SlotParam, p2?: SlotParam, p3?: SlotParam, p4?: SlotParam, p5?: SlotParam, p6?: SlotParam) => browserClient().setChargePeriods(serial, powerRate, stopSOC, p1, p2, p3, p4, p5, p6);
export const setDischargePeriods   = (serial: string, powerRate: string, stopSOC: string, p1: SlotParam, p2?: SlotParam, p3?: SlotParam, p4?: SlotParam, p5?: SlotParam, p6?: SlotParam) => browserClient().setDischargePeriods(serial, powerRate, stopSOC, p1, p2, p3, p4, p5, p6);
