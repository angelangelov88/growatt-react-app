import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { fieldErrors } from "../../lib/fieldErrors";
import { settingsSchema } from "../../lib/settingsSchema";
import type { ChargeSettings, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { ChargeSettingsFormProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

// The fixed overnight charge window (optional), and how the inverter charges
// from the grid. Starts from what's saved; edits stay here until Save.
const ChargeSettingsForm = ({ saved }: ChargeSettingsFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [windowEnabled, setWindowEnabled] = useState(saved.windowEnabled);
  const [chargeStart, setChargeStart] = useState(saved.chargeStart);
  const [chargeEnd, setChargeEnd] = useState(saved.chargeEnd);
  const [powerRate, setPowerRate] = useState(String(saved.powerRate));
  const [stopSOC, setStopSOC] = useState(String(saved.stopSOC));
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: ChargeSettings) =>
      apiRequest<Settings>("settings", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast("Battery First settings saved", "success");
    },
  });

  const isChanged =
    windowEnabled !== saved.windowEnabled ||
    chargeStart !== saved.chargeStart ||
    chargeEnd !== saved.chargeEnd ||
    powerRate !== String(saved.powerRate) ||
    stopSOC !== String(saved.stopSOC);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Empty boxes become NaN, so they fail as "Use a whole number".
    const toNumber = (text: string) => (text.trim() ? Number(text) : NaN);
    const parsed = settingsSchema.safeParse({
      windowEnabled,
      chargeStart,
      chargeEnd,
      powerRate: toNumber(powerRate),
      stopSOC: toNumber(stopSOC),
      // Changed only by the switch.
      automationEnabled: saved.automationEnabled,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      {save.error && <FormAlert message={save.error.message} />}
      <div className="flex items-start gap-3">
        <input
          id="window-enabled"
          type="checkbox"
          checked={windowEnabled}
          onChange={(e) => {
            setWindowEnabled(e.target.checked);
          }}
          disabled={save.isPending}
          aria-describedby="window-enabled-hint"
          className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="window-enabled" className="text-sm text-gray-200">
            Charge in my own window
          </label>
          <span id="window-enabled-hint" className="text-xs text-gray-500">
            {windowEnabled
              ? "Charges every night between these times, plus your Octopus slots. Octopus slots inside the window are left out, and ones partly inside are cut to the part outside."
              : "Only your Octopus slots are used, up to 6 of them. With none planned, the inverter doesn't charge from the grid."}
          </span>
        </div>
      </div>
      {windowEnabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="charge-start"
              label="Charge from"
              type="time"
              value={chargeStart}
              onChange={(e) => {
                setChargeStart(e.target.value);
              }}
              error={errors.chargeStart}
              disabled={save.isPending}
              required
            />
            <TextField
              id="charge-end"
              label="Until"
              type="time"
              value={chargeEnd}
              onChange={(e) => {
                setChargeEnd(e.target.value);
              }}
              error={errors.chargeEnd}
              disabled={save.isPending}
              required
            />
          </div>
          <p className="-mt-2 text-xs text-gray-500">
            UK time, every night. It has to end before midnight.
          </p>
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="power-rate"
          label="Charge power (%)"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          value={powerRate}
          onChange={(e) => {
            setPowerRate(e.target.value);
          }}
          error={errors.powerRate}
          disabled={save.isPending}
          required
        />
        <TextField
          id="stop-soc"
          label="Stop at battery (%)"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          value={stopSOC}
          onChange={(e) => {
            setStopSOC(e.target.value);
          }}
          error={errors.stopSOC}
          disabled={save.isPending}
          required
        />
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        How much of the inverter&apos;s power to charge from the grid with, and
        the battery level to stop at. Used for the Octopus slots too.
      </p>
      {isChanged && (
        <SubmitButton
          label="Save Battery First settings"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default ChargeSettingsForm;
