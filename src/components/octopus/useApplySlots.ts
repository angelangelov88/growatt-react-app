import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setChargePeriods } from "../growatt/growattApi";
import type { SlotParam } from "../growatt/growattApi";

type Slot = { startDt: string; endDt: string };
type SlotsData = { plannedDispatches: Slot[] } | undefined;

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

const getUpcomingSlots = (slotsData: SlotsData) => {
  const now = new Date();
  return (slotsData?.plannedDispatches ?? []).filter((s) => new Date(s.endDt) > now);
};

export default function useApplySlots({ slotsData }: { slotsData: SlotsData }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ p1, p2, p3, p4, p5, p6 }: { p1: SlotParam; p2: SlotParam; p3: SlotParam; p4: SlotParam; p5: SlotParam; p6: SlotParam }) =>
      setChargePeriods(serial, "35", "95", p1, p2, p3, p4, p5, p6),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["growatt", "chargePeriods"] });
    },
  });

  const applySlots = () => {
    const upcoming = getUpcomingSlots(slotsData);
    mutation.mutate({
      p1: upcoming[0] ? toSlotParam(upcoming[0]) : null,
      p2: upcoming[1] ? toSlotParam(upcoming[1]) : null,
      p3: upcoming[2] ? toSlotParam(upcoming[2]) : null,
      p4: upcoming[3] ? toSlotParam(upcoming[3]) : null,
      p5: upcoming[4] ? toSlotParam(upcoming[4]) : null,
      p6: upcoming[5] ? toSlotParam(upcoming[5]) : null,
    });
  };

  const upcoming = getUpcomingSlots(slotsData);
  const extraSlotsMessage = upcoming.length > 6
    ? `${upcoming.length - 6} slot(s) not applied (max 6 Octopus slots supported)`
    : null;

  return useMemo(
    () => ({ applySlots, extraSlotsMessage, isPending: mutation.isPending, error: mutation.error }),
    [mutation.isPending, mutation.error, extraSlotsMessage],
  );
}
