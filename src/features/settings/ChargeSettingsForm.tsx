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
import type { Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { ChargeSettingsFormProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

// The fixed overnight charge window, and how the inverter charges from the
// grid. Starts from what's saved; edits stay here until Save.
const ChargeSettingsForm = ({ saved }: ChargeSettingsFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [chargeStart, setChargeStart] = useState(saved.chargeStart);
  const [chargeEnd, setChargeEnd] = useState(saved.chargeEnd);
  const [powerRate, setPowerRate] = useState(String(saved.powerRate));
  const [stopSOC, setStopSOC] = useState(String(saved.stopSOC));
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: Settings) =>
      apiRequest<Settings>("settings", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast("Charge settings saved", "success");
    },
  });

  const isChanged =
    chargeStart !== saved.chargeStart ||
    chargeEnd !== saved.chargeEnd ||
    powerRate !== String(saved.powerRate) ||
    stopSOC !== String(saved.stopSOC);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Empty boxes become NaN, so they fail as "Use a whole number".
    const toNumber = (text: string) => (text.trim() ? Number(text) : NaN);
    const parsed = settingsSchema.safeParse({
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
          label="Save charge settings"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default ChargeSettingsForm;
