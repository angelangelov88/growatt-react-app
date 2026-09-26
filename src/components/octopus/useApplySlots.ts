import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setChargePeriods } from "../growatt/growattApi";
import {
  CHARGE_KEY,
  chargePeriodsQueryOptions,
  toPeriods,
} from "../growatt/useGrowatt";
import {
  buildChargePlan,
  describePlan,
  type ChargePlan,
  type Dispatch,
} from "./chargePlan";

type SlotsData = { plannedDispatches: Dispatch[] } | undefined;

const serial = import.meta.env.VITE_GROWATT_SERIAL;

const useApplySlots = ({ slotsData }: { slotsData: SlotsData }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (plan: ChargePlan) =>
      setChargePeriods(serial, plan.powerRate, plan.stopSOC, ...plan.slots),
    onSuccess: (_, plan) => {
      // Show the new charge periods on the Battery First card straight away, then
      // check them against the inverter in the background. query() is used because
      // refetchQueries skips queries with enabled: false.
      queryClient.setQueryData(
        CHARGE_KEY,
        toPeriods(plan.powerRate, plan.stopSOC, plan.slots),
      );
      queryClient
        .query({ ...chargePeriodsQueryOptions, staleTime: 0 })
        .catch(() => undefined);
    },
  });

  const plan = slotsData ? buildChargePlan(slotsData.plannedDispatches) : null;

  const applySlots = () => {
    if (slotsData)
      mutation.mutate(buildChargePlan(slotsData.plannedDispatches));
  };

  const planSummary = plan ? describePlan(plan) : null;
  const extraSlotsMessage = plan?.skipped
    ? `${String(plan.skipped)} Octopus period(s) not applied — the inverter only has 6 slots`
    : null;

  return useMemo(
    () => ({
      applySlots,
      planSummary,
      extraSlotsMessage,
      isPending: mutation.isPending,
      error: mutation.error,
    }),
    [
      mutation.isPending,
      mutation.error,
      planSummary,
      extraSlotsMessage,
      slotsData,
    ],
  );
};

export default useApplySlots;
