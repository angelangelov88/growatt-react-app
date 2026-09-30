import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { GROWATT_RESET } from "../../lib/dailyExport";
import { dailyExportSchema } from "../../lib/settingsSchema";
import type { DailyExport, ExportSlot, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type {
  DailyExportDraft,
  DailyExportFormProps,
} from "../../types/Settings";
import TimePicker from "../growatt/TimePicker";
import {
  RATE_OPTIONS,
  SOC_OPTIONS,
  selectClass,
  timeToSlot,
  withCurrent,
} from "../growatt/slotOptions";
import { SETTINGS_KEY } from "./useSettings";

const SELECT = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;
const MAX_SLOTS = 6;
const NEW_SLOT: ExportSlot = { start: "18:00", end: "19:00" };

const toDraft = (d: DailyExport): DailyExportDraft => ({
  ...d,
  powerRate: String(d.powerRate),
  stopSOC: String(d.stopSOC),
});

// Export times put on the inverter every day, and back after Growatt clears
// them each night. Starts from what's saved; edits stay here until Save.
const DailyExportForm = ({ saved }: DailyExportFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const savedDraft = toDraft(saved.dailyExport);
  const [draft, setDraft] = useState(savedDraft);
  // Keyed by path, e.g. "slots", "slots.1.end", "powerRate".
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: DailyExport) =>
      apiRequest<Settings>("settings?part=daily", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      setDraft(toDraft(settings.dailyExport));
      showToast("Export to grid settings saved", "success");
    },
  });

  const isChanged = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const { slots } = draft;

  const setSlots = (next: ExportSlot[]) => {
    setDraft((prev) => ({ ...prev, slots: next }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = dailyExportSchema.safeParse({
      ...draft,
      powerRate: Number(draft.powerRate),
      stopSOC: Number(draft.stopSOC),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  // The same 5% dropdowns as the dashboard's Export to grid card.
  const renderSelect = (
    field: "powerRate" | "stopSOC",
    label: string,
    options: string[],
  ) => {
    const id = `daily-export-${field}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm text-gray-300">
          {label}
        </label>
        <select
          id={id}
          value={draft[field]}
          onChange={(e) => {
            setDraft((prev) => ({ ...prev, [field]: e.target.value }));
          }}
          disabled={save.isPending}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={errors[field] ? `${id}-error` : undefined}
          className={SELECT}
        >
          {withCurrent(options, draft[field]).map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
        {errors[field] && (
          <p id={`${id}-error`} className="text-xs text-red-400">
            {errors[field]}
          </p>
        )}
      </div>
    );
  };

  const renderSlot = (slot: ExportSlot, i: number) => {
    const error = errors[`slots.${String(i)}.end`];
    const errorId = `daily-export-slot-${String(i)}-error`;
    return (
      <div key={i} className="bg-gray-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">
            Slot {i + 1}
          </span>
          <button
            type="button"
            onClick={() => {
              setSlots(slots.filter((_, j) => j !== i));
            }}
            disabled={save.isPending}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        <TimePicker
          slot={timeToSlot(slot.start, slot.end)}
          label={`Slot ${String(i + 1)}`}
          onChange={(field, part) => {
            const next = { ...timeToSlot(slot.start, slot.end), [field]: part };
            setSlots(
              slots.map((s, j) =>
                j === i
                  ? {
                      start: `${next.startHour}:${next.startMin}`,
                      end: `${next.endHour}:${next.endMin}`,
                    }
                  : s,
              ),
            );
          }}
          disabled={save.isPending}
          invalid={!!error}
          describedBy={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
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
          id="daily-export-enabled"
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => {
            setDraft((prev) => ({ ...prev, enabled: e.target.checked }));
          }}
          disabled={save.isPending}
          aria-describedby="daily-export-enabled-hint"
          className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="daily-export-enabled"
            className="text-sm text-gray-200"
          >
            Export every day
          </label>
          <span
            id="daily-export-enabled-hint"
            className="text-xs text-gray-500"
          >
            {draft.enabled
              ? `Set on your inverter within 5 minutes of saving. Growatt clears export times every night at ${GROWATT_RESET}, and we put these back a few minutes later.`
              : `Growatt clears export times every night at ${GROWATT_RESET}. Turn this on to have yours put back every day.`}
          </span>
        </div>
      </div>
      {draft.enabled && (
        <>
          <div className="flex flex-col gap-3">
            {slots.map(renderSlot)}
            {slots.length < MAX_SLOTS && (
              <button
                type="button"
                onClick={() => {
                  setSlots([...slots, NEW_SLOT]);
                }}
                disabled={save.isPending}
                className="w-full py-2 rounded-xl text-sm font-medium border border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                + Add slot
              </button>
            )}
            {errors.slots && (
              <p className="text-xs text-red-400">{errors.slots}</p>
            )}
          </div>
          <p className="-mt-2 text-xs text-gray-500">
            UK time. A slot across {GROWATT_RESET} pauses for about 5 minutes.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {renderSelect("powerRate", "Discharge power", RATE_OPTIONS)}
            {renderSelect("stopSOC", "Stop at battery", SOC_OPTIONS)}
          </div>
        </>
      )}
      {isChanged && (
        <SubmitButton
          label="Save export to grid settings"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default DailyExportForm;
