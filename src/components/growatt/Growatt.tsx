import { useEffect, useRef, useState } from "react";
import useGrowatt from "./useGrowatt";
import { useSlotForm, type SlotState } from "./useSlotForm";
import useInverterRead from "./useInverterRead";
import BatteryFirstCard from "./BatteryFirstCard";
import GridFirstCard from "./GridFirstCard";
import { PRESETS } from "./slotOptions";
import { useToast } from "../../contexts/ToastContext";
import PowerDownSessions from "../octopus/PowerDownSessions";
import {
  sessionToSlot,
  type PowerDownSession,
} from "../octopus/savingSessions";

// A slot as [start, end) minutes, with end past midnight (above 1440) if it wraps.
const slotRange = (s: SlotState): [number, number] => {
  const start = Number(s.startHour) * 60 + Number(s.startMin);
  let end = Number(s.endHour) * 60 + Number(s.endMin);
  if (end <= start) end += 24 * 60;
  return [start, end];
};

const slotsOverlap = (a: SlotState, b: SlotState) => {
  const [aStart, aEnd] = slotRange(a);
  const [bStart, bEnd] = slotRange(b);
  // Also compare a day either side, for slots that wrap past midnight.
  return [-1440, 0, 1440].some(
    (shift) => aStart < bEnd + shift && bStart + shift < aEnd,
  );
};

const formatSlot = (s: SlotState) =>
  `${s.startHour}:${s.startMin}–${s.endHour}:${s.endMin}`;

const Growatt = () => {
  const {
    setChargePeriodsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
  } = useGrowatt();

  const chargeForm = useSlotForm("35", "95");
  const chargeReader = useInverterRead(chargePeriodsQuery, chargeForm);
  const dischargeForm = useSlotForm("95", "20");
  const dischargeReader = useInverterRead(dischargePeriodsQuery, dischargeForm);

  const { showToast } = useToast();
  const gridFirstRef = useRef<HTMLDivElement>(null);
  // A session window waiting to be added once Grid First has loaded.
  const [pendingSessionSlot, setPendingSessionSlot] =
    useState<SlotState | null>(null);

  // Fills the Grid First form only; the user reviews it and presses Apply.
  const addSessionSlot = (slot: SlotState) => {
    const clash = dischargeForm.slots.find((s) => slotsOverlap(s, slot));
    if (clash) {
      showToast(
        `Grid First already has ${formatSlot(clash)}, which overlaps this session`,
        "error",
      );
      return;
    }
    if (!dischargeForm.canAddSlot) {
      showToast("Grid First already has 6 slots — remove one first", "error");
      return;
    }
    dischargeForm.appendSlot(
      PRESETS.high.powerRate,
      PRESETS.high.stopSOC,
      slot,
    );
    showToast(
      `Added ${formatSlot(slot)} to Grid First with High Export — review it and press Apply`,
      "info",
    );
    gridFirstRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const exportDuringSession = (session: PowerDownSession) => {
    const slot = sessionToSlot(session);
    if (dischargeForm.isLoaded) return addSessionSlot(slot);
    setPendingSessionSlot(slot);
    dischargeReader.read();
  };

  // Once Grid First has loaded, add the waiting slot; drop it if the load failed
  // (the card already shows the read error).
  useEffect(() => {
    if (!pendingSessionSlot) return;
    if (dischargeForm.isLoaded) {
      addSessionSlot(pendingSessionSlot);
      setPendingSessionSlot(null);
    } else if (!dischargeReader.isReading) {
      setPendingSessionSlot(null);
    }
  }, [dischargeForm.isLoaded, dischargeReader.isReading]);

  const isBusy =
    chargeReader.isReading ||
    dischargeReader.isReading ||
    setChargePeriodsMutation.isPending ||
    setDischargeMutation.isPending;

  // Both reads go through the client's queue, so they run one after the other.
  const readAll = () => {
    if (
      (chargeReader.hasUnsavedChanges || dischargeReader.hasUnsavedChanges) &&
      !window.confirm(
        "You have unsaved changes. Load the settings from your inverter and discard them?",
      )
    )
      return;
    chargeReader.read({ confirmed: true });
    dischargeReader.read({ confirmed: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Inverter settings</p>
        <button
          onClick={readAll}
          disabled={isBusy}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load all
        </button>
      </div>
      <BatteryFirstCard
        form={chargeForm}
        reader={chargeReader}
        setChargePeriodsMutation={setChargePeriodsMutation}
      />
      <PowerDownSessions
        onExportDuringSession={exportDuringSession}
        exportDisabled={
          dischargeReader.isReading ||
          setDischargeMutation.isPending ||
          !!pendingSessionSlot
        }
      />
      <div ref={gridFirstRef} className="scroll-mt-4">
        <GridFirstCard
          form={dischargeForm}
          reader={dischargeReader}
          setDischargeMutation={setDischargeMutation}
        />
      </div>
    </div>
  );
};

export default Growatt;
