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

type SlotListProps = { form: SlotForm };

type TimePickerProps = {
  slot: SlotState;
  onChange: (field: keyof SlotState, value: string) => void;
};

export type {
  SlotForm,
  InverterRead,
  BatteryFirstProps,
  GridFirstProps,
  SlotListProps,
  TimePickerProps,
};
