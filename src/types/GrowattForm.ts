import type useGrowatt from "../features/growatt/useGrowatt";
import type { useSlotForm } from "../features/growatt/useSlotForm";
import type useInverterRead from "../features/growatt/useInverterRead";
import type { SlotState } from "./Growatt";

type SlotForm = ReturnType<typeof useSlotForm>;

type InverterRead = ReturnType<typeof useInverterRead>;

type BatteryFirstProps = {
  form: SlotForm;
  reader: InverterRead;
  setChargePeriodsMutation: ReturnType<
    typeof useGrowatt
  >["setChargePeriodsMutation"];
};

type GridFirstProps = {
  form: SlotForm;
  reader: InverterRead;
  setDischargeMutation: ReturnType<typeof useGrowatt>["setDischargeMutation"];
};

// Export until battery %: writes through the Export to grid card's mutation,
// and refreshes that card afterwards.
type ExportUntilProps = {
  reader: InverterRead;
  setDischargeMutation: ReturnType<typeof useGrowatt>["setDischargeMutation"];
};

type GrowattProps = { showSessions: boolean };

// readOnly: shows the slots without letting them change.
type SlotListProps = { form: SlotForm; readOnly?: boolean };

// label names the dropdowns for screen readers, e.g. "Peak" → "Peak start
// hour". invalid marks it as having an error; describedBy points at the
// error or hint under the picker.
type TimePickerProps = {
  slot: SlotState;
  onChange: (field: keyof SlotState, value: string) => void;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export type {
  SlotForm,
  InverterRead,
  BatteryFirstProps,
  GridFirstProps,
  ExportUntilProps,
  GrowattProps,
  SlotListProps,
  TimePickerProps,
};
