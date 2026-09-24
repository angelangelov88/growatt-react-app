import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  setDefaultPeriods, fetchChargePeriods, setChargePeriods,
  fetchDischargePeriods, setDischargePeriods, disableAllDischargePeriods,
  type SlotParam,
} from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

function useGrowatt() {
  const queryClient = useQueryClient();

  const setChargePeriodsMutation = useMutation({
    mutationFn: (vars: { powerRate: string; stopSOC: string; slots: (SlotParam)[] }) =>
      setChargePeriods(serial, vars.powerRate, vars.stopSOC, vars.slots[0], vars.slots[1], vars.slots[2], vars.slots[3], vars.slots[4], vars.slots[5]),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "chargePeriods"] });
    },
  });

  const setDefaultsMutation = useMutation({
    mutationFn: () => setDefaultPeriods(serial),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "chargePeriods"] });
    },
  });

  const chargePeriodsQuery = useQuery({
    queryKey: ["growatt", "chargePeriods"],
    queryFn: () => fetchChargePeriods(serial),
    retry: false,
    staleTime: Infinity,
  });

  const dischargePeriodsQuery = useQuery({
    queryKey: ["growatt", "dischargePeriods"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return fetchDischargePeriods(serial);
    },
    retry: false,
    staleTime: Infinity,
  });

  const setDischargeMutation = useMutation({
    mutationFn: (vars: { powerRate: string; stopSOC: string; p1: SlotParam; p2?: SlotParam; p3?: SlotParam; p4?: SlotParam; p5?: SlotParam; p6?: SlotParam }) =>
      setDischargePeriods(serial, vars.powerRate, vars.stopSOC, vars.p1, vars.p2, vars.p3, vars.p4, vars.p5, vars.p6),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "dischargePeriods"] });
    },
  });

  const disableAllDischargeMutation = useMutation({
    mutationFn: () => disableAllDischargePeriods(serial),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "dischargePeriods"] });
    },
  });

  return {
    setChargePeriodsMutation,
    setDefaultsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
    disableAllDischargeMutation,
  };
}

export default useGrowatt;
