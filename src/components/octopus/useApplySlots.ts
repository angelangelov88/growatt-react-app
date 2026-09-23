import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { setChargePeriods } from "../growatt/growattApi";
import type { SlotParam } from "../growatt/growattApi";
import type { Slot, SlotsData } from "../../types/Slots";

const serial = import.meta.env.VITE_GROWATT_SERIAL;

const toSlotParam = (slot: Slot): SlotParam => {
  const start = new Date(slot.startDt);
  const end = new Date(slot.endDt);
  return {
    startHour: String(start.getHours()).padStart(2, "0"),
    startMin: String(start.getMinutes()).padStart(2, "0"),
    endHour: String(end.getHours()).padStart(2, "0"),
    endMin: String(end.getMinutes()).padStart(2, "0"),
  };
};

const getUpcomingSlots = (slotsData: SlotsData | undefined) => {
  const now = new Date();
  return (slotsData?.plannedDispatches ?? []).filter(
    (s) => new Date(s.endDt) > now,
  );
};

export default function useApplySlots({ slotsData }: { slotsData: SlotsData | undefined }) {
  const mutation = useMutation({
    mutationFn: ({ p2, p3 }: { p2: SlotParam; p3: SlotParam }) =>
      setChargePeriods(serial, p2, p3),
  });

  const applySlots = () => {
    const upcoming = getUpcomingSlots(slotsData);
    const p2 = upcoming[0] ? toSlotParam(upcoming[0]) : null;
    const p3 = upcoming[1] ? toSlotParam(upcoming[1]) : null;
    mutation.mutate({ p2, p3 });
  };

  const upcoming = getUpcomingSlots(slotsData);
  const extraSlotsMessage = upcoming.length > 2
    ? `${upcoming.length - 2} more slot(s) not applied (only 2 periods available)`
    : null;

  return useMemo(
    () => ({ applySlots, extraSlotsMessage, isPending: mutation.isPending, error: mutation.error }),
    [mutation.isPending, mutation.error, extraSlotsMessage],
  );
}
