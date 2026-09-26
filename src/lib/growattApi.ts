import SparkMD5 from "spark-md5";
import type {
  ChargePeriod,
  ChargePeriods,
  DischargePeriods,
  GrowattConfig,
  GrowattResponse,
  SlotParam,
} from "../types/Growatt";

// ─── Factory ──────────────────────────────────────────────────────────────────
// Used by the Node script (passes process.env values + direct Growatt URL).
// Used by the browser (passes Vite env values + proxy URL builder).

const createGrowattClient = ({
  user,
  password,
  buildUrl,
  cookieHeader = "Cookie",
}: GrowattConfig) => {
  const STORAGE_KEY = "growatt_session";
  // sessionStorage only exists in the browser; the Node script keeps the session in memory.
  const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
  let sessionCookie = storage?.getItem(STORAGE_KEY) ?? "";
  let loginPromise: Promise<void> | null = null;

  const request = async (
    path: string,
    body?: Record<string, string>,
    isRetry = false,
  ): Promise<GrowattResponse> => {
    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (sessionCookie) headers[cookieHeader] = sessionCookie;

    const res = await fetch(buildUrl(path), {
      method: body ? "POST" : "GET",
      headers,
      body: body ? new URLSearchParams(body) : undefined,
    });

    const setCookie =
      res.headers.get("x-set-cookie") ?? res.headers.get("set-cookie");
    if (setCookie) {
      const match = /JSESSIONID=[^;]+/.exec(setCookie);
      if (match) {
        sessionCookie = match[0];
        storage?.setItem(STORAGE_KEY, sessionCookie);
      }
    }

    const text = await res.text();
    console.log(`${body ? "POST" : "GET"} ${path}:`, text);
    let json: GrowattResponse;
    try {
      json = JSON.parse(text) as GrowattResponse;
    } catch {
      throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
    }

    // Detect session expiry and retry once
    const msg = json.msg?.toLowerCase() ?? "";
    const isAuthError =
      json.success === false &&
      (msg.includes("login") || msg.includes("session"));

    if (!isRetry && isAuthError) {
      sessionCookie = "";
      storage?.removeItem(STORAGE_KEY);
      loginPromise = null;
      await ensureLoggedIn();
      return request(path, body, true);
    }

    if (json.success === false) throw new Error(json.msg ?? "Request failed");

    return json;
  };

  const ensureLoggedIn = () => {
    if (sessionCookie) return Promise.resolve();
    loginPromise ??= request("/login", {
      account: user,
      password: "",
      passwordCrc: SparkMD5.hash(password),
      validateCode: "",
      isReadPact: "0",
      type: "1",
    })
      .then((data) => {
        loginPromise = null;
        if (data.result !== 1) throw new Error(data.msg ?? "Login failed");
      })
      .catch((err: unknown) => {
        loginPromise = null;
        throw err;
      });
    return loginPromise;
  };

  const readDelay = () => new Promise((resolve) => setTimeout(resolve, 3000));
  const writeDelay = () => new Promise((resolve) => setTimeout(resolve, 10000));

  // The inverter can only handle one tcpSet call at a time, so every read/write
  // goes through this queue, with a gap before the next one starts. The datalogger
  // needs ~2-3s between commands, otherwise reads come back empty.
  const QUEUE_GAP_MS = 3000;
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run
      .catch(() => undefined)
      .then(() => new Promise((resolve) => setTimeout(resolve, QUEUE_GAP_MS)));
    return run;
  };

  const decodeTime = (n: number) => {
    const h = Math.floor(n / 256);
    const m = n % 256;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const safe = (v: number[], offset: number): ChargePeriod =>
    offset < v.length
      ? {
          start: decodeTime(v[offset]),
          end: decodeTime(v[offset + 1]),
          enabled: v[offset + 2] === 1,
        }
      : { start: "--", end: "--", enabled: false };

  const slotParams46 = (
    p4: SlotParam,
    p5: SlotParam,
    p6: SlotParam,
  ): Record<string, string> => ({
    param1: p4?.startHour ?? "00",
    param2: p4?.startMin ?? "00",
    param3: p4?.endHour ?? "00",
    param4: p4?.endMin ?? "00",
    param5: p4 ? "1" : "0",
    param6: p5?.startHour ?? "00",
    param7: p5?.startMin ?? "00",
    param8: p5?.endHour ?? "00",
    param9: p5?.endMin ?? "00",
    param10: p5 ? "1" : "0",
    param11: p6?.startHour ?? "00",
    param12: p6?.startMin ?? "00",
    param13: p6?.endHour ?? "00",
    param14: p6?.endMin ?? "00",
    param15: p6 ? "1" : "0",
  });

  // readMixParam sometimes returns {"success":true,"msg":""} when the datalogger is busy.
  // Treat a missing or short reply as a failure: retry, then throw, never return partial data.
  const READ_ATTEMPTS = 3;
  const READ_RETRY_MS = 3000;
  const readParam = async (
    serial: string,
    paramId: string,
    minLength: number,
  ) => {
    for (let attempt = 1; ; attempt++) {
      const data = await request("/tcpSet.do", {
        action: "readMixParam",
        paramId,
        serialNum: serial,
        startAddr: "-1",
        endAddr: "-1",
      });
      const msg = data.msg ?? "";
      const values = msg.split("-").filter(Boolean).map(Number);
      if (values.length >= minLength && !values.some(Number.isNaN))
        return { msg, values };
      if (attempt >= READ_ATTEMPTS)
        throw new Error(
          `Inverter returned no data for ${paramId} — it may be busy, try again`,
        );
      console.warn(
        `${paramId}: empty reply (attempt ${String(attempt)}/${String(READ_ATTEMPTS)}), retrying in ${String(READ_RETRY_MS / 1000)}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, READ_RETRY_MS));
    }
  };

  // Periods 1-3 plus rate/SOC come from the first param (19 values); 4-6 from the second (9 values),
  // which is only read when 1-3 are all enabled.
  const readPeriods = async (
    serial: string,
    paramId13: string,
    paramId46: string,
  ): Promise<ChargePeriods> => {
    await ensureLoggedIn();
    const first = await readParam(serial, paramId13, 19);
    const v1 = first.values;
    const p1 = safe(v1, 10),
      p2 = safe(v1, 13),
      p3 = safe(v1, 16);
    const hasMore = p1.enabled && p2.enabled && p3.enabled;
    let v2: number[] = [];
    if (hasMore) {
      await readDelay();
      v2 = (await readParam(serial, paramId46, 9)).values;
    }
    return {
      powerRate: v1[0],
      stopSOC: v1[1],
      raw: `[1-3]: ${first.msg}`,
      period1: p1,
      period2: p2,
      period3: p3,
      period4: safe(v2, 0),
      period5: safe(v2, 3),
      period6: safe(v2, 6),
    };
  };

  return {
    fetchChargePeriods: (serial: string): Promise<ChargePeriods> =>
      enqueue(() =>
        readPeriods(
          serial,
          "mix_ac_charge_time_multi",
          "mix_ac_charge_time_multi_1",
        ),
      ),

    fetchDischargePeriods: (serial: string): Promise<DischargePeriods> =>
      enqueue(() =>
        readPeriods(
          serial,
          "MIX_AC_DISCHARGE_TIME_MULTI",
          "mix_ac_discharge_time_multi_1",
        ),
      ),

    setChargePeriods: (
      serial: string,
      powerRate: string,
      stopSOC: string,
      p1: SlotParam,
      p2: SlotParam = null,
      p3: SlotParam = null,
      p4: SlotParam = null,
      p5: SlotParam = null,
      p6: SlotParam = null,
    ) =>
      enqueue(async () => {
        await ensureLoggedIn();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_charge_time_period",
          param1: powerRate,
          param2: stopSOC,
          param3: "1",
          param4: p1?.startHour ?? "00",
          param5: p1?.startMin ?? "00",
          param6: p1?.endHour ?? "00",
          param7: p1?.endMin ?? "00",
          param8: p1 ? "1" : "0",
          param9: p2?.startHour ?? "00",
          param10: p2?.startMin ?? "00",
          param11: p2?.endHour ?? "00",
          param12: p2?.endMin ?? "00",
          param13: p2 ? "1" : "0",
          param14: p3?.startHour ?? "00",
          param15: p3?.startMin ?? "00",
          param16: p3?.endHour ?? "00",
          param17: p3?.endMin ?? "00",
          param18: p3 ? "1" : "0",
        });
        if (!p4 && !p5 && !p6) return;
        await writeDelay();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_charge_time_multi_1",
          ...slotParams46(p4, p5, p6),
        });
      }),

    setDischargePeriods: (
      serial: string,
      powerRate: string,
      stopSOC: string,
      p1: SlotParam,
      p2: SlotParam = null,
      p3: SlotParam = null,
      p4: SlotParam = null,
      p5: SlotParam = null,
      p6: SlotParam = null,
    ) =>
      enqueue(async () => {
        await ensureLoggedIn();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_discharge_time_period",
          param1: powerRate,
          param2: stopSOC,
          param3: p1?.startHour ?? "00",
          param4: p1?.startMin ?? "00",
          param5: p1?.endHour ?? "00",
          param6: p1?.endMin ?? "00",
          param7: p1 ? "1" : "0",
          param8: p2?.startHour ?? "00",
          param9: p2?.startMin ?? "00",
          param10: p2?.endHour ?? "00",
          param11: p2?.endMin ?? "00",
          param12: p2 ? "1" : "0",
          param13: p3?.startHour ?? "00",
          param14: p3?.startMin ?? "00",
          param15: p3?.endHour ?? "00",
          param16: p3?.endMin ?? "00",
          param17: p3 ? "1" : "0",
        });
        if (!p4 && !p5 && !p6) return;
        await writeDelay();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_discharge_time_multi_1",
          ...slotParams46(p4, p5, p6),
        });
      }),
  };
};

// ─── Browser singleton ────────────────────────────────────────────────────────
// The browser cannot set the Cookie header directly (forbidden header).
// Instead we store the session cookie in memory and send it via X-Session-Cookie,
// which the Vercel proxy reads and forwards as Cookie to Growatt.

let _client: ReturnType<typeof createGrowattClient> | null = null;

const browserClient = () => {
  _client ??= createGrowattClient({
    user: import.meta.env.VITE_GROWATT_USER,
    password: import.meta.env.VITE_GROWATT_PASSWORD,
    cookieHeader: "X-Session-Cookie",
    buildUrl: (path) => {
      if (import.meta.env.DEV) return `/growatt${path}`;
      const clean = path.startsWith("/") ? path.slice(1) : path;
      return `/api/growatt?path=${encodeURIComponent(clean)}`;
    },
  });
  return _client;
};

const fetchChargePeriods = (serial: string) =>
  browserClient().fetchChargePeriods(serial);
const fetchDischargePeriods = (serial: string) =>
  browserClient().fetchDischargePeriods(serial);
const setChargePeriods = (
  serial: string,
  powerRate: string,
  stopSOC: string,
  p1: SlotParam,
  p2?: SlotParam,
  p3?: SlotParam,
  p4?: SlotParam,
  p5?: SlotParam,
  p6?: SlotParam,
) =>
  browserClient().setChargePeriods(
    serial,
    powerRate,
    stopSOC,
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
  );
const setDischargePeriods = (
  serial: string,
  powerRate: string,
  stopSOC: string,
  p1: SlotParam,
  p2?: SlotParam,
  p3?: SlotParam,
  p4?: SlotParam,
  p5?: SlotParam,
  p6?: SlotParam,
) =>
  browserClient().setDischargePeriods(
    serial,
    powerRate,
    stopSOC,
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
  );

export {
  createGrowattClient,
  fetchChargePeriods,
  fetchDischargePeriods,
  setChargePeriods,
  setDischargePeriods,
};
