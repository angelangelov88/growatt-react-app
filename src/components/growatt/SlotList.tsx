import TimePicker from "./TimePicker";
import type { SlotForm } from "./useSlotForm";

const SlotList = ({ form }: { form: SlotForm }) => (
  <>
    <div className="flex flex-col gap-3 mb-4">
      {form.slots.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-3">
          No slots — all periods disabled
        </p>
      )}
      {form.slots.map((slot, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">
              Slot {i + 1}
            </span>
            <button
              onClick={() => form.removeSlot(i)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-0.5"
            >
              Remove
            </button>
          </div>
          <TimePicker
            slot={slot}
            onChange={(field, value) => form.updateSlot(i, field, value)}
          />
        </div>
      ))}
    </div>
    {form.canAddSlot && (
      <button
        onClick={form.addSlot}
        className="w-full py-2 rounded-xl text-sm font-medium border border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors mb-4"
      >
        + Add Slot
      </button>
    )}
  </>
);

export default SlotList;
