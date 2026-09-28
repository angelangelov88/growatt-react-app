import SparkMD5 from "spark-md5";
import { createGrowattClient } from "../../lib/growattApi";
import type { SlotParam } from "../../types/Growatt";

// TEMPORARY: the browser still talks to Growatt through the /api/growatt proxy
// with credentials from VITE_* variables. Phase 4 replaces this with calls to
// our own API, and these variables go away.

// The browser cannot set the Cookie header directly (forbidden header).
// Instead we store the session cookie in sessionStorage and send it via
// X-Session-Cookie, which the Vercel proxy reads and forwards as Cookie to Growatt.

let _client: ReturnType<typeof createGrowattClient> | null = null;

const browserClient = () => {
  _client ??= createGrowattClient({
    user: import.meta.env.VITE_GROWATT_USER,
    passwordMd5: SparkMD5.hash(import.meta.env.VITE_GROWATT_PASSWORD),
    cookieHeader: "X-Session-Cookie",
    storage: sessionStorage,
    debug: import.meta.env.DEV,
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
  fetchChargePeriods,
  fetchDischargePeriods,
  setChargePeriods,
  setDischargePeriods,
};
