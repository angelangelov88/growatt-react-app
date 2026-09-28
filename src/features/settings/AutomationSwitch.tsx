import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import type { Settings } from "../../types/Api";
import type { AutomationSwitchProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

// Turns automation on or off straight away. Sends the other settings as saved,
// so unsaved edits in the charge form stay unsaved.
const AutomationSwitch = ({ saved, canTurnOn }: AutomationSwitchProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isOn = saved.automationEnabled;

  const toggle = useMutation({
    mutationFn: (automationEnabled: boolean) =>
      apiRequest<Settings>("settings", {
        method: "PUT",
        body: { ...saved, automationEnabled },
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast(
        settings.automationEnabled
          ? "Automation turned on"
          : "Automation turned off",
        "success",
      );
    },
  });
  const isDisabled = toggle.isPending || (!isOn && !canTurnOn);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span id="automation-label" className="text-sm text-gray-200">
            Apply my Octopus slots to the inverter
          </span>
          <span id="automation-hint" className="text-sm text-gray-400">
            {!isOn && !canTurnOn
              ? "Save your Growatt and Octopus details above first."
              : "Checked through the evening and night. The overnight window below is always kept, and the inverter has room for 5 Octopus slots on top."}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby="automation-label"
          aria-describedby="automation-hint"
          disabled={isDisabled}
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

export default AutomationSwitch;
