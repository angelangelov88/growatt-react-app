import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { PeriodsBody } from "../../types/Api";
import type {
  ChargePeriod,
  ChargePeriods,
  PeriodsInput,
  SlotParam,
} from "../../types/Growatt";

type Kind = "charge" | "discharge";

// The inverter takes one command at a time and needs a few seconds between
// them, otherwise reads come back empty. Each /api/growatt call gets its own
// client on the server, so the app sends them one after another, with a gap.
const GAP_MS = 3000;
let queue: Promise<unknown> = Promise.resolve();
const growattRequest = <T = undefined>(
  kind: Kind,
  options?: { method: "PUT"; body: PeriodsBody },
): Promise<T> => {
  const send = () => apiRequest<T>(`growatt/${kind}`, options);
  const run = queue.then(send, send);
  queue = run
    .catch(() => undefined)
    .then(() => new Promise((resolve) => setTimeout(resolve, GAP_MS)));
  return run;
};

const CHARGE_KEY = ["growatt", "chargePeriods"];
const DISCHARGE_KEY = ["growatt", "dischargePeriods"];

// Shared with the Octopus card, which also writes charge periods.
const chargePeriodsQueryOptions = queryOptions({
  queryKey: CHARGE_KEY,
  queryFn: () => growattRequest<ChargePeriods>("charge"),
  retry: false,
  staleTime: Infinity,
});

// The enabled slots in order; the server turns the rest off.
const enabledSlots = (slots: SlotParam[]) =>
  slots.filter((s): s is NonNullable<SlotParam> => s !== null);

// Writes Battery First (charge) or Grid First (discharge) periods.
const putPeriods = (kind: Kind, { powerRate, stopSOC, slots }: PeriodsInput) =>
  growattRequest(kind, {
    method: "PUT",
    body: {
      powerRate: Number(powerRate),
      stopSOC: Number(stopSOC),
      slots: enabledSlots(slots).map((s) => ({
        start: `${s.startHour}:${s.startMin}`,
        end: `${s.endHour}:${s.endMin}`,
      })),
    },
  });

// Marks cache data that was written after a save rather than read from the inverter,
// so the next real read can be recognised as the check of that save.
const SAVED_RAW = "(saved)";
const isSavedData = (data: ChargePeriods) => data.raw === SAVED_RAW;

// Builds what a read would return for the values just written, so the cache
// reflects a successful save straight away instead of waiting for the inverter.
const toPeriods = ({
  powerRate,
  stopSOC,
  slots,
}: PeriodsInput): ChargePeriods => {
  const enabled = enabledSlots(slots);
  const period = (i: number): ChargePeriod => {
    const s = i < enabled.length ? enabled[i] : null;
    return s
      ? {
          start: `${s.startHour}:${s.startMin}`,
          end: `${s.endHour}:${s.endMin}`,
          enabled: true,
        }
      : { start: "00:00", end: "00:00", enabled: false };
  };
  return {
    powerRate: Number(powerRate),
    stopSOC: Number(stopSOC),
    raw: SAVED_RAW,
    period1: period(0),
    period2: period(1),
    period3: period(2),
    period4: period(3),
    period5: period(4),
    period6: period(5),
  };
};

const useGrowatt = () => {
  const queryClient = useQueryClient();

  const setChargePeriodsMutation = useMutation({
    mutationFn: (input: PeriodsInput) => putPeriods("charge", input),
    onSuccess: (_, input) => {
      queryClient.setQueryData(CHARGE_KEY, toPeriods(input));
    },
  });

  const chargePeriodsQuery = useQuery({
    ...chargePeriodsQueryOptions,
    enabled: false,
  });

  const dischargePeriodsQuery = useQuery({
    queryKey: DISCHARGE_KEY,
    queryFn: () => growattRequest<ChargePeriods>("discharge"),
    retry: false,
    staleTime: Infinity,
    enabled: false,
  });

  const setDischargeMutation = useMutation({
    mutationFn: (input: PeriodsInput) => putPeriods("discharge", input),
    onSuccess: (_, input) => {
      queryClient.setQueryData(DISCHARGE_KEY, toPeriods(input));
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
  putPeriods,
  toPeriods,
};
export default useGrowatt;
