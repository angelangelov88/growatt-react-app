import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { SlotParam } from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;
const user = import.meta.env.VITE_GROWATT_USER;
const password = import.meta.env.VITE_GROWATT_PASSWORD;

function useGrowatt() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => login(user, password),
    onSuccess: () => setIsLoggedIn(true),
  });

  const chargeTimeMutation = useMutation({
    mutationFn: ({ p2, p3 }: { p2: SlotParam; p3: SlotParam }) =>
      setChargePeriods(serial, p2, p3),
  });

  const chargePeriodsQuery = useQuery({
    queryKey: ["growatt", "chargePeriods"],
    queryFn: () => fetchChargePeriods(serial),
    enabled: false,
    retry: false,
  });

  return {
    isLoggedIn,
    loginMutation,
    chargeTimeMutation,
    chargePeriodsQuery,
  };
}

export default useGrowatt;
