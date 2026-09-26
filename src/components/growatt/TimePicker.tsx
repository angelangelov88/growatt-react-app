import type { SlotState } from "./useSlotForm";
import { HOURS, minuteOptions, selectClass } from "./slotOptions";

const TimePicker = ({
  slot,
  onChange,
}: {
  slot: SlotState;
  onChange: (field: keyof SlotState, value: string) => void;
}) => (
  <div className="flex items-center gap-1">
    <select
      value={slot.startHour}
      onChange={(e) => onChange("startHour", e.target.value)}
      className={selectClass}
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
    <span className="text-gray-400 font-mono text-sm shrink-0">:</span>
    <select
      value={slot.startMin}
      onChange={(e) => onChange("startMin", e.target.value)}
      className={selectClass}
    >
      {minuteOptions(slot.startMin).map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
    <span className="text-gray-500 font-mono text-xs shrink-0 px-1">–</span>
    <select
      value={slot.endHour}
      onChange={(e) => onChange("endHour", e.target.value)}
      className={selectClass}
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
    <span className="text-gray-400 font-mono text-sm shrink-0">:</span>
    <select
      value={slot.endMin}
      onChange={(e) => onChange("endMin", e.target.value)}
      className={selectClass}
    >
      {minuteOptions(slot.endMin).map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  </div>
);

export default TimePicker;
