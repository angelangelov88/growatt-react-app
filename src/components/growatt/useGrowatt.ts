import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { login, setDefaultPeriods, fetchChargePeriods } from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;
const user = import.meta.env.VITE_GROWATT_USER;
const password = import.meta.env.VITE_GROWATT_PASSWORD;

function useGrowatt() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: () => login(user, password),
    onSuccess: () => setIsLoggedIn(true),
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
    enabled: false,
    retry: false,
  });

  return {
    isLoggedIn,
    loginMutation,
    setDefaultsMutation,
    chargePeriodsQuery,
  };
}

export default useGrowatt;
