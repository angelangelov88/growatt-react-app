import { useState, useMemo, useRef } from "react";
import type { ChargePeriods, SlotParam } from "./growattApi";

export type SlotState = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
};

const DEFAULT_SLOT: SlotState = {
  startHour: "00",
  startMin: "00",
  endHour: "00",
  endMin: "00",
};

const periodToSlot = (p: { start: string; end: string }): SlotState => {
  const [startHour, startMin] = p.start.split(":");
  const [endHour, endMin] = p.end.split(":");
  return { startHour, startMin, endHour, endMin };
};

const isValidPeriod = (p: { start: string; end: string; enabled: boolean }) =>
  p.enabled && p.start !== "--";

const slotToParam = (s: SlotState): SlotParam => ({
  startHour: s.startHour,
  startMin: s.startMin,
  endHour: s.endHour,
  endMin: s.endMin,
});

type Snapshot = { powerRate: string; stopSOC: string; slots: SlotState[] };

const toSnapshot = (data: ChargePeriods): Snapshot => ({
  powerRate: String(data.powerRate),
  stopSOC: String(data.stopSOC),
  slots: [
    data.period1,
    data.period2,
    data.period3,
    data.period4,
    data.period5,
    data.period6,
  ]
    .filter(isValidPeriod)
    .map(periodToSlot),
});

const snapshotsEqual = (a: Snapshot | null, b: Snapshot): boolean => {
  if (!a) return false;
  if (a.powerRate !== b.powerRate || a.stopSOC !== b.stopSOC) return false;
  if (a.slots.length !== b.slots.length) return false;
  return a.slots.every(
    (s, i) =>
      s.startHour === b.slots[i].startHour &&
      s.startMin === b.slots[i].startMin &&
      s.endHour === b.slots[i].endHour &&
      s.endMin === b.slots[i].endMin,
  );
};

export const useSlotForm = (
  defaultPowerRate: string,
  defaultStopSOC: string,
) => {
  const [powerRate, setPowerRate] = useState(defaultPowerRate);
  const [stopSOC, setStopSOC] = useState(defaultStopSOC);
  const [slots, setSlots] = useState<SlotState[]>([]);
  // False until the form holds real values — from an inverter read or a preset the user picked.
  const [isLoaded, setIsLoaded] = useState(false);
  const lastRead = useRef<Snapshot | null>(null);

  const updateSlot = (index: number, field: keyof SlotState, value: string) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const addSlot = () => {
    if (slots.length < 6) setSlots((prev) => [...prev, { ...DEFAULT_SLOT }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // Charge and discharge periods share the same shape.
  const load = (data: ChargePeriods) => {
    const next = toSnapshot(data);
    setPowerRate(next.powerRate);
    setStopSOC(next.stopSOC);
    setSlots(next.slots);
    setIsLoaded(true);
    lastRead.current = next;
  };

  // True when the form already shows exactly these values.
  const matches = (data: ChargePeriods) =>
    snapshotsEqual(toSnapshot(data), { powerRate, stopSOC, slots });

  const setDefaults = (rate: string, soc: string, defaultSlot: SlotState) => {
    setPowerRate(rate);
    setStopSOC(soc);
    setSlots([{ ...defaultSlot }]);
    setIsLoaded(true);
  };

  const disableAll = (rate: string, soc: string) => {
    setPowerRate(rate);
    setStopSOC(soc);
    setSlots([]);
    setIsLoaded(true);
  };

  const toParams = (): [
    SlotParam,
    SlotParam,
    SlotParam,
    SlotParam,
    SlotParam,
    SlotParam,
  ] => {
    const get = (i: number): SlotParam =>
      slots[i] ? slotToParam(slots[i]) : null;
    return [get(0), get(1), get(2), get(3), get(4), get(5)];
  };

  const isDirty = !snapshotsEqual(lastRead.current, {
    powerRate,
    stopSOC,
    slots,
  });

  return useMemo(
    () => ({
      powerRate,
      setPowerRate,
      stopSOC,
      setStopSOC,
      slots,
      updateSlot,
      addSlot,
      removeSlot,
      load,
      matches,
      setDefaults,
      disableAll,
      toParams,
      canAddSlot: slots.length < 6,
      isDirty,
      isLoaded,
    }),
    [powerRate, stopSOC, slots, isDirty, isLoaded],
  );
};
