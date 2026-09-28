import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { Settings } from "../../types/Api";

const SETTINGS_KEY = ["settings"];

// The overnight charge window, power rate, stop SOC and automation switch.
const useSettings = () =>
  useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiRequest<Settings>("settings"),
  });

export default useSettings;
export { SETTINGS_KEY };
