import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { login, fetchPlantList, fetchDevicesByPlant, setChargePeriods } from "./growattApi";
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

  const plantListQuery = useQuery({
    queryKey: ["growatt", "plantList"],
    queryFn: fetchPlantList,
    enabled: isLoggedIn,
    retry: false,
  });

  const plantId = plantListQuery.data?.data?.[0]?.id
    ?? plantListQuery.data?.data?.[0]?.plantId
    ?? plantListQuery.data?.[0]?.id
    ?? plantListQuery.data?.[0]?.plantId;

  const deviceListQuery = useQuery({
    queryKey: ["growatt", "deviceList", plantId],
    queryFn: () => fetchDevicesByPlant(plantId!),
    enabled: !!plantId,
    retry: false,
  });

  const chargeTimeMutation = useMutation({
    mutationFn: ({ p2, p3 }: { p2: SlotParam; p3: SlotParam }) =>
      setChargePeriods(serial, p2, p3),
  });

  return {
    isLoggedIn,
    loginMutation,
    plantListQuery,
    deviceListQuery,
    chargeTimeMutation,
  };
}

export default useGrowatt;
