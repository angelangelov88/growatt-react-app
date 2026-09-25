import { useState, useMemo, useRef } from "react";
import type { ChargePeriods, DischargePeriods, SlotParam } from "./growattApi";

export type SlotState = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
};

const DEFAULT_SLOT: SlotState = { startHour: "00", startMin: "00", endHour: "00", endMin: "00" };

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

const snapshotsEqual = (a: Snapshot | null, b: Snapshot): boolean => {
  if (!a) return false;
  if (a.powerRate !== b.powerRate || a.stopSOC !== b.stopSOC) return false;
  if (a.slots.length !== b.slots.length) return false;
  return a.slots.every((s, i) =>
    s.startHour === b.slots[i].startHour &&
    s.startMin === b.slots[i].startMin &&
    s.endHour === b.slots[i].endHour &&
    s.endMin === b.slots[i].endMin
  );
};

export const useSlotForm = (defaultPowerRate: string, defaultStopSOC: string) => {
  const [powerRate, setPowerRate] = useState(defaultPowerRate);
  const [stopSOC, setStopSOC] = useState(defaultStopSOC);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const lastRead = useRef<Snapshot | null>(null);

  const updateSlot = (index: number, field: keyof SlotState, value: string) => {
    setSlots((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSlot = () => {
    if (slots.length < 6) setSlots((prev) => [...prev, { ...DEFAULT_SLOT }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const loadFromChargePeriods = (data: ChargePeriods) => {
    const pr = String(data.powerRate);
    const soc = String(data.stopSOC);
    const periods = [data.period1, data.period2, data.period3, data.period4, data.period5, data.period6];
    const newSlots = periods.filter(isValidPeriod).map(periodToSlot);
    setPowerRate(pr);
    setStopSOC(soc);
    setSlots(newSlots);
    lastRead.current = { powerRate: pr, stopSOC: soc, slots: newSlots };
  };

  const loadFromDischargePeriods = (data: DischargePeriods) => {
    const pr = String(data.powerRate);
    const soc = String(data.stopSOC);
    const periods = [data.period1, data.period2, data.period3, data.period4, data.period5, data.period6];
    const newSlots = periods.filter(isValidPeriod).map(periodToSlot);
    setPowerRate(pr);
    setStopSOC(soc);
    setSlots(newSlots);
    lastRead.current = { powerRate: pr, stopSOC: soc, slots: newSlots };
  };

  const setDefaults = (rate: string, soc: string, defaultSlot: SlotState) => {
    setPowerRate(rate);
    setStopSOC(soc);
    setSlots([{ ...defaultSlot }]);
  };

  const disableAll = (rate: string, soc: string) => {
    setPowerRate(rate);
    setStopSOC(soc);
    setSlots([]);
  };

  const markClean = () => {
    lastRead.current = { powerRate, stopSOC, slots };
  };

  const toParams = (): [SlotParam, SlotParam, SlotParam, SlotParam, SlotParam, SlotParam] => {
    const get = (i: number): SlotParam => slots[i] ? slotToParam(slots[i]) : null;
    return [get(0), get(1), get(2), get(3), get(4), get(5)];
  };

  const isDirty = !snapshotsEqual(lastRead.current, { powerRate, stopSOC, slots });

  return useMemo(() => ({
    powerRate, setPowerRate,
    stopSOC, setStopSOC,
    slots, updateSlot, addSlot, removeSlot,
    loadFromChargePeriods, loadFromDischargePeriods,
    setDefaults, disableAll, markClean, toParams,
    canAddSlot: slots.length < 6,
    isDirty,
  }), [powerRate, stopSOC, slots, isDirty]);
};
