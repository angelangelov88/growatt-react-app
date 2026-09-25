import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchChargePeriods, setChargePeriods,
  fetchDischargePeriods, setDischargePeriods,
  type SlotParam,
} from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

function useGrowatt() {
  const setChargePeriodsMutation = useMutation({
    mutationFn: (vars: { powerRate: string; stopSOC: string; slots: (SlotParam)[] }) =>
      setChargePeriods(serial, vars.powerRate, vars.stopSOC, vars.slots[0], vars.slots[1], vars.slots[2], vars.slots[3], vars.slots[4], vars.slots[5]),
  });

  const chargePeriodsQuery = useQuery({
    queryKey: ["growatt", "chargePeriods"],
    queryFn: () => fetchChargePeriods(serial),
    retry: false,
    staleTime: Infinity,
    enabled: false,
  });

  const dischargePeriodsQuery = useQuery({
    queryKey: ["growatt", "dischargePeriods"],
    queryFn: () => fetchDischargePeriods(serial),
    retry: false,
    staleTime: Infinity,
    enabled: false,
  });

  const setDischargeMutation = useMutation({
    mutationFn: (vars: { powerRate: string; stopSOC: string; p1: SlotParam; p2?: SlotParam; p3?: SlotParam; p4?: SlotParam; p5?: SlotParam; p6?: SlotParam }) =>
      setDischargePeriods(serial, vars.powerRate, vars.stopSOC, vars.p1, vars.p2, vars.p3, vars.p4, vars.p5, vars.p6),
  });

  return {
    setChargePeriodsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
  };
}

export default useGrowatt;
