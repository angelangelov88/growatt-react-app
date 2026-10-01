import TextField from "../../components/TextField";
import type { ExportPresetFieldsProps } from "../../types/Settings";
import TimePicker from "../growatt/TimePicker";
import {
  RATE_OPTIONS,
  SOC_OPTIONS,
  selectClass,
  timeToSlot,
} from "../growatt/slotOptions";

// The same dropdowns as the dashboard's Export to grid card.
const SELECT = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;

// One Export to grid preset: its name, times, discharge power and stop level.
const ExportPresetFields = ({
  preset,
  value,
  errors,
  disabled,
  onChange,
  onReset,
  isDefault,
}: ExportPresetFieldsProps) => {
  const id = (field: string) => `${preset}-export-${field}`;
  const timesError = errors.start ?? errors.end;
  const renderSelect = (
    field: "powerRate" | "stopSOC",
    label: string,
    options: string[],
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id(field)} className="text-sm text-gray-300">
        {label}
      </label>
      <select
        id={id(field)}
        value={value[field]}
        onChange={(e) => {
          onChange(field, e.target.value);
        }}
        disabled={disabled}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? id(`${field}-error`) : undefined}
        className={SELECT}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v}%
          </option>
        ))}
      </select>
      {errors[field] && (
        <p id={id(`${field}-error`)} className="text-xs text-red-400">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <fieldset className="flex flex-col gap-4 min-w-0">
      <legend className="mb-3 text-sm font-medium text-strong truncate max-w-full">
        {value.name.trim() || "Unnamed preset"}
      </legend>
      <TextField
        id={id("name")}
        label="Name"
        type="text"
        maxLength={20}
        autoComplete="off"
        value={value.name}
        onChange={(e) => {
          onChange("name", e.target.value);
        }}
        error={errors.name}
        disabled={disabled}
        required
      />
      <div
        role="group"
        aria-labelledby={id("times-label")}
        className="flex flex-col gap-1.5"
      >
        <span id={id("times-label")} className="text-sm text-gray-300">
          Times
        </span>
        <TimePicker
          slot={timeToSlot(value.start, value.end)}
          onChange={(field, part) => {
            const slot = {
              ...timeToSlot(value.start, value.end),
              [field]: part,
            };
            if (field.startsWith("start"))
              onChange("start", `${slot.startHour}:${slot.startMin}`);
            else onChange("end", `${slot.endHour}:${slot.endMin}`);
          }}
          disabled={disabled}
          invalid={!!timesError}
          describedBy={timesError ? id("times-error") : undefined}
        />
        {timesError && (
          <p id={id("times-error")} className="text-xs text-red-400">
            {timesError}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {renderSelect("powerRate", "Discharge power", RATE_OPTIONS)}
        {renderSelect("stopSOC", "Stop at battery", SOC_OPTIONS)}
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled || isDefault}
        className="self-start text-sm text-violet-400 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
      >
        Reset to default
      </button>
    </fieldset>
  );
};

export default ExportPresetFields;
