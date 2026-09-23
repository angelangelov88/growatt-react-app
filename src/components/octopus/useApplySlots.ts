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
    mutationFn: ({ p2, p3, p4, p5, p6 }: { p2: SlotParam; p3: SlotParam; p4: SlotParam; p5: SlotParam; p6: SlotParam }) =>
      setChargePeriods(serial, p2, p3, p4, p5, p6),
  });

  const applySlots = () => {
    const upcoming = getUpcomingSlots(slotsData);
    mutation.mutate({
      p2: upcoming[0] ? toSlotParam(upcoming[0]) : null,
      p3: upcoming[1] ? toSlotParam(upcoming[1]) : null,
      p4: upcoming[2] ? toSlotParam(upcoming[2]) : null,
      p5: upcoming[3] ? toSlotParam(upcoming[3]) : null,
      p6: upcoming[4] ? toSlotParam(upcoming[4]) : null,
    });
  };

  const upcoming = getUpcomingSlots(slotsData);
  const extraSlotsMessage = upcoming.length > 5
    ? `${upcoming.length - 5} slot(s) not applied (max 5 Octopus slots supported)`
    : null;

  return useMemo(
    () => ({ applySlots, extraSlotsMessage, isPending: mutation.isPending, error: mutation.error }),
    [mutation.isPending, mutation.error, extraSlotsMessage],
  );
}
