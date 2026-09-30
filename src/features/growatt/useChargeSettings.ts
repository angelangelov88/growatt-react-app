import { defaultSettings } from "../../lib/settingsSchema";
import useSettings from "../settings/useSettings";

// The user's Battery First settings, or the defaults while settings load or
// if they fail.
const useChargeSettings = () => {
  const { data } = useSettings();
  return data ?? defaultSettings;
};

export default useChargeSettings;
