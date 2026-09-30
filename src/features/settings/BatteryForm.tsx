import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { batterySchema } from "../../lib/settingsSchema";
import type { BatteryInfo, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { BatteryDraft, BatteryFormProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

const toDraft = (s: Settings): BatteryDraft => ({
  batteryKwh: s.batteryKwh === null ? "" : String(s.batteryKwh),
  maxDischargeKw: s.maxDischargeKw === null ? "" : String(s.maxDischargeKw),
});

// Blank is "Enter a number", not 0.
const toNumber = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));

// Battery size and max discharge power. Starts from what's saved; edits stay
// here until Save.
const BatteryForm = ({ saved }: BatteryFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const savedDraft = toDraft(saved);
  const [draft, setDraft] = useState(savedDraft);
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: BatteryInfo) =>
      apiRequest<Settings>("settings?part=battery", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      setDraft(toDraft(settings));
      showToast("Battery details saved", "success");
    },
  });

  const isChanged =
    draft.batteryKwh !== savedDraft.batteryKwh ||
    draft.maxDischargeKw !== savedDraft.maxDischargeKw;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = batterySchema.safeParse({
      batteryKwh: toNumber(draft.batteryKwh),
      maxDischargeKw: toNumber(draft.maxDischargeKw),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues)
        next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const field = (
    key: keyof BatteryDraft,
    label: string,
    hint: string,
    placeholder: string,
  ) => (
    <TextField
      id={`battery-${key}`}
      label={label}
      hint={hint}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={draft[key]}
      onChange={(e) => {
        setDraft((prev) => ({ ...prev, [key]: e.target.value }));
      }}
      error={errors[key]}
      disabled={save.isPending}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {save.error && <FormAlert message={save.error.message} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "batteryKwh",
          "Battery size (kWh)",
          "How much your battery holds.",
          "e.g. 5.9",
        )}
        {field(
          "maxDischargeKw",
          "Max discharge power (kW)",
          "How fast it discharges at a 100% rate.",
          "e.g. 3.7",
        )}
      </div>
      {isChanged && (
        <div>
          <SubmitButton
            label="Save battery details"
            pendingLabel="Saving…"
            isPending={save.isPending}
          />
        </div>
      )}
    </form>
  );
};

export default BatteryForm;
