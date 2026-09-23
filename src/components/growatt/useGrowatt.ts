import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchUserInfo, fetchDeviceList, setChargeTime } from "./growattApi";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

function useGrowatt() {
  const userInfoQuery = useQuery({
    queryKey: ["growatt", "userInfo"],
    queryFn: fetchUserInfo,
    enabled: false,
    retry: false,
  });

  const deviceListQuery = useQuery({
    queryKey: ["growatt", "deviceList"],
    queryFn: fetchDeviceList,
    enabled: false,
    retry: false,
  });

  const chargeTimeMutation = useMutation({
    mutationFn: ({
      startHour,
      startMin,
      endHour,
      endMin,
    }: {
      startHour: string;
      startMin: string;
      endHour: string;
      endMin: string;
    }) => setChargeTime(serial, startHour, startMin, endHour, endMin),
  });

  return {
    userInfoQuery,
    deviceListQuery,
    chargeTimeMutation,
  };
}

export default useGrowatt;
