import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchChargePeriods,
  setChargePeriods,
  fetchDischargePeriods,
  setDischargePeriods,
  type ChargePeriod,
  type ChargePeriods,
  type SlotParam,
} from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

const CHARGE_KEY = ["growatt", "chargePeriods"];
const DISCHARGE_KEY = ["growatt", "dischargePeriods"];

// Shared with the Octopus card, which also writes charge periods.
const chargePeriodsQueryOptions = queryOptions({
  queryKey: CHARGE_KEY,
  queryFn: () => fetchChargePeriods(serial),
  retry: false,
  staleTime: Infinity,
});

// Marks cache data that was written after a save rather than read from the inverter,
// so the next real read can be recognised as the check of that save.
const SAVED_RAW = "(saved)";
const isSavedData = (data: ChargePeriods) => data.raw === SAVED_RAW;

// Builds what a read would return for the values just written, so the cache
// reflects a successful save straight away instead of waiting for the inverter.
const toPeriods = (
  powerRate: string,
  stopSOC: string,
  slots: SlotParam[],
): ChargePeriods => {
  const period = (s: SlotParam | undefined): ChargePeriod =>
    s
      ? {
          start: `${s.startHour}:${s.startMin}`,
          end: `${s.endHour}:${s.endMin}`,
          enabled: true,
        }
      : { start: "00:00", end: "00:00", enabled: false };
  return {
    powerRate: Number(powerRate),
    stopSOC: Number(stopSOC),
    raw: SAVED_RAW,
    period1: period(slots[0]),
    period2: period(slots[1]),
    period3: period(slots[2]),
    period4: period(slots[3]),
    period5: period(slots[4]),
    period6: period(slots[5]),
  };
};

const useGrowatt = () => {
  const queryClient = useQueryClient();

  const setChargePeriodsMutation = useMutation({
    mutationFn: (vars: {
      powerRate: string;
      stopSOC: string;
      slots: SlotParam[];
    }) =>
      setChargePeriods(
        serial,
        vars.powerRate,
        vars.stopSOC,
        vars.slots[0],
        vars.slots[1],
        vars.slots[2],
        vars.slots[3],
        vars.slots[4],
        vars.slots[5],
      ),
    onSuccess: (_, vars) => {
      queryClient.setQueryData(
        CHARGE_KEY,
        toPeriods(vars.powerRate, vars.stopSOC, vars.slots),
      );
    },
  });

  const chargePeriodsQuery = useQuery({
    ...chargePeriodsQueryOptions,
    enabled: false,
  });

  const dischargePeriodsQuery = useQuery({
    queryKey: DISCHARGE_KEY,
    queryFn: () => fetchDischargePeriods(serial),
    retry: false,
    staleTime: Infinity,
    enabled: false,
  });

  const setDischargeMutation = useMutation({
    mutationFn: (vars: {
      powerRate: string;
      stopSOC: string;
      p1: SlotParam;
      p2?: SlotParam;
      p3?: SlotParam;
      p4?: SlotParam;
      p5?: SlotParam;
      p6?: SlotParam;
    }) =>
      setDischargePeriods(
        serial,
        vars.powerRate,
        vars.stopSOC,
        vars.p1,
        vars.p2,
        vars.p3,
        vars.p4,
        vars.p5,
        vars.p6,
      ),
    onSuccess: (_, vars) => {
      queryClient.setQueryData(
        DISCHARGE_KEY,
        toPeriods(vars.powerRate, vars.stopSOC, [
          vars.p1,
          vars.p2 ?? null,
          vars.p3 ?? null,
          vars.p4 ?? null,
          vars.p5 ?? null,
          vars.p6 ?? null,
        ]),
      );
    },
  });

  return {
    setChargePeriodsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
  };
};

export {
  CHARGE_KEY,
  DISCHARGE_KEY,
  chargePeriodsQueryOptions,
  isSavedData,
  toPeriods,
};
export default useGrowatt;
