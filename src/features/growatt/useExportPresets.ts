import { defaultExportPresets } from "../../lib/settingsSchema";
import useSettings from "../settings/useSettings";

// The user's Export to grid presets, or the defaults while settings load or if
// they fail.
const useExportPresets = () => {
  const { data } = useSettings();
  return data?.exportPresets ?? defaultExportPresets;
};

export default useExportPresets;
