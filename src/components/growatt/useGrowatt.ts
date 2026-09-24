import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  setDefaultPeriods, fetchChargePeriods,
  fetchDischargePeriods, setDischargePeriods, disableAllDischargePeriods,
  type SlotParam,
} from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

function useGrowatt() {
  const queryClient = useQueryClient();

  const setDefaultsMutation = useMutation({
    mutationFn: () => setDefaultPeriods(serial),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "chargePeriods"] });
    },
  });

  const chargePeriodsQuery = useQuery({
    queryKey: ["growatt", "chargePeriods"],
    queryFn: () => fetchChargePeriods(serial),
    enabled: false,
    retry: false,
  });

  const dischargePeriodsQuery = useQuery({
    queryKey: ["growatt", "dischargePeriods"],
    queryFn: () => fetchDischargePeriods(serial),
    enabled: false,
    retry: false,
  });

  const setDischargeMutation = useMutation({
    mutationFn: (vars: { powerRate: string; stopSOC: string; p1: SlotParam }) =>
      setDischargePeriods(serial, vars.powerRate, vars.stopSOC, vars.p1),
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
    setDefaultsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
    disableAllDischargeMutation,
  };
}

export default useGrowatt;
