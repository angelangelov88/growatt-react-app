import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { GROWATT_RESET } from "../../lib/dailyExport";
import type { DailyExport, Settings } from "../../types/Api";
import type { DailyExportSwitchProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

// Turns Export every day on or off straight away.
const DailyExportSwitch = ({ saved }: DailyExportSwitchProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isOn = saved.exportEveryDay;

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest<Settings>("settings?part=daily", {
        method: "PUT",
        body: { enabled } satisfies DailyExport,
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast(
        settings.exportEveryDay
          ? "Export every day turned on"
          : "Export every day turned off",
        "success",
      );
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span id="daily-export-label" className="text-sm text-gray-200">
            Export every day
          </span>
          <span id="daily-export-hint" className="text-sm text-gray-400">
            Growatt clears export times every night at {GROWATT_RESET}. When
            this is on, we put back the ones you last applied on the dashboard a
            few minutes later.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby="daily-export-label"
          aria-describedby="daily-export-hint"
          disabled={toggle.isPending}
          onClick={() => {
            toggle.mutate(!isOn);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:opacity-40 disabled:cursor-not-allowed ${
            isOn ? "bg-violet-600" : "bg-gray-700"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {toggle.error && <FormAlert message={toggle.error.message} />}
    </div>
  );
};

export default DailyExportSwitch;
