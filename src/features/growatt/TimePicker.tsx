import type { SlotState } from "../../types/Growatt";
import type { TimePickerProps } from "../../types/GrowattForm";
import { HOURS, minuteOptions, selectClass } from "./slotOptions";

const PARTS: { field: keyof SlotState; name: string }[] = [
  { field: "startHour", name: "start hour" },
  { field: "startMin", name: "start minute" },
  { field: "endHour", name: "end hour" },
  { field: "endMin", name: "end minute" },
];

const TimePicker = ({
  slot,
  onChange,
  label,
  disabled,
  invalid,
  describedBy,
}: TimePickerProps) => {
  const renderSelect = ({ field, name }: (typeof PARTS)[number]) => (
    <select
      value={slot[field]}
      onChange={(e) => {
        onChange(field, e.target.value);
      }}
      aria-label={
        label ? `${label} ${name}` : name.replace(/^./, (c) => c.toUpperCase())
      }
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled}
      className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {(field.endsWith("Hour") ? HOURS : minuteOptions(slot[field])).map(
        (v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ),
      )}
    </select>
  );

  return (
    <div className="flex items-center gap-1">
      {renderSelect(PARTS[0])}
      <span className="text-gray-400 font-mono text-sm shrink-0">:</span>
      {renderSelect(PARTS[1])}
      <span className="text-gray-500 font-mono text-xs shrink-0 px-1">–</span>
      {renderSelect(PARTS[2])}
      <span className="text-gray-400 font-mono text-sm shrink-0">:</span>
      {renderSelect(PARTS[3])}
    </div>
  );
};

export default TimePicker;
