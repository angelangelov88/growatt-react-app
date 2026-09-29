import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import {
  defaultExportPresets,
  exportPresetsSchema,
} from "../../lib/settingsSchema";
import type {
  ExportPreset,
  ExportPresets,
  Preset,
  Settings,
} from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type {
  ExportPresetDraft,
  ExportPresetDrafts,
  ExportPresetsFormProps,
} from "../../types/Settings";
import ExportPresetFields from "./ExportPresetFields";
import { SETTINGS_KEY } from "./useSettings";

const PRESET_KEYS: Preset[] = ["high", "low"];

const toDraft = (p: ExportPreset): ExportPresetDraft => ({
  ...p,
  powerRate: String(p.powerRate),
  stopSOC: String(p.stopSOC),
});

const toDrafts = (presets: ExportPresets): ExportPresetDrafts => ({
  high: toDraft(presets.high),
  low: toDraft(presets.low),
});

const sameDrafts = (a: ExportPresetDrafts, b: ExportPresetDrafts) =>
  JSON.stringify(a) === JSON.stringify(b);

// The two Grid First preset buttons on the dashboard. Starts from what's
// saved; edits stay here until Save.
const ExportPresetsForm = ({ saved }: ExportPresetsFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const savedDrafts = toDrafts(saved.exportPresets);
  const [drafts, setDrafts] = useState(savedDrafts);
  // Keyed by preset, then field, e.g. errors.high?.name.
  const [errors, setErrors] = useState<Partial<Record<Preset, FieldErrors>>>(
    {},
  );

  const save = useMutation({
    mutationFn: (body: ExportPresets) =>
      apiRequest<Settings>("settings?part=export", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      // Shows the saved values, e.g. the trimmed names.
      setDrafts(toDrafts(settings.exportPresets));
      showToast("Grid First presets saved", "success");
    },
  });

  const isChanged = !sameDrafts(drafts, savedDrafts);
  const defaults = toDrafts(defaultExportPresets);

  const handleChange =
    (preset: Preset) => (field: keyof ExportPresetDraft, value: string) => {
      setDrafts((prev) => ({
        ...prev,
        [preset]: { ...prev[preset], [field]: value },
      }));
    };

  const handleReset = (preset: Preset) => () => {
    setDrafts((prev) => ({ ...prev, [preset]: defaults[preset] }));
    setErrors((prev) => ({ ...prev, [preset]: {} }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const toBody = (d: ExportPresetDraft) => ({
      ...d,
      powerRate: Number(d.powerRate),
      stopSOC: Number(d.stopSOC),
    });
    const parsed = exportPresetsSchema.safeParse({
      high: toBody(drafts.high),
      low: toBody(drafts.low),
    });
    if (!parsed.success) {
      // The first message for each field of each preset.
      const next: Partial<Record<Preset, FieldErrors>> = {};
      for (const issue of parsed.error.issues) {
        const [preset, field] = issue.path.map(String) as [Preset, string];
        next[preset] ??= {};
        next[preset][field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {save.error && <FormAlert message={save.error.message} />}
      <div className="grid gap-6 sm:grid-cols-2">
        {PRESET_KEYS.map((preset) => (
          <ExportPresetFields
            key={preset}
            preset={preset}
            value={drafts[preset]}
            errors={errors[preset] ?? {}}
            disabled={save.isPending}
            onChange={handleChange(preset)}
            onReset={handleReset(preset)}
            isDefault={
              JSON.stringify(drafts[preset]) ===
              JSON.stringify(defaults[preset])
            }
          />
        ))}
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        UK time. Each one has to end after it starts, before midnight.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {isChanged && (
          <SubmitButton
            label="Save presets"
            pendingLabel="Saving…"
            isPending={save.isPending}
          />
        )}
      </div>
    </form>
  );
};

export default ExportPresetsForm;
