import { useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import useGrowatt, { isSavedData } from "./useGrowatt";
import type { ChargePeriods } from "./growattApi";
import { sameSettings, useSlotForm, type SlotState } from "./useSlotForm";
import { useToast } from "../../contexts/ToastContext";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const SOC_OPTIONS = Array.from({ length: 20 }, (_, i) => String((i + 1) * 5));
const RATE_OPTIONS = Array.from({ length: 20 }, (_, i) => String((i + 1) * 5));

const selectClass =
  "bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 appearance-none text-center w-full";

const Spinner = ({ className = "text-gray-400" }: { className?: string }) => (
  <svg
    className={`animate-spin h-4 w-4 shrink-0 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const minuteOptions = (current: string) => {
  const opts = MINUTES.includes(current)
    ? MINUTES
    : [...MINUTES, current].sort((a, b) => Number(a) - Number(b));
  return opts;
};

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

const SlotList = ({ form }: { form: ReturnType<typeof useSlotForm> }) => (
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

const NotReadYet = ({
  isReading,
  hint,
}: {
  isReading: boolean;
  hint: string;
}) => (
  <div className="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center">
    {isReading ? (
      <p className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Spinner />
        Reading from inverter…
      </p>
    ) : (
      <>
        <p className="text-sm text-gray-300">Not read yet</p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </>
    )}
  </div>
);

// ─── Inverter reads ───────────────────────────────────────────────────────────
// A Read the user presses locks the card and always loads the result. Any other data
// change (values written to the cache after a save — from this card or the Octopus
// card — then the background read that checks them) is only loaded if it doesn't
// clash with unsaved edits.

const useInverterRead = (
  query: UseQueryResult<ChargePeriods>,
  form: ReturnType<typeof useSlotForm>,
) => {
  const { showToast } = useToast();
  const [isReading, setIsReading] = useState(false);
  const userRead = useRef(false);
  const prevData = useRef<ChargePeriods | undefined>(undefined);
  const hasUnsavedChanges = form.isLoaded && form.isDirty;

  useEffect(() => {
    const data = query.data;
    const prev = prevData.current;
    prevData.current = data;
    if (!data) return;
    const isUserRead = userRead.current;
    userRead.current = false;
    if (isUserRead || form.matches(data)) return form.load(data);
    // A real read following a save is the check of that save. If it agrees, nothing to do.
    const isSaveCheck = !!prev && isSavedData(prev) && !isSavedData(data);
    if (isSaveCheck && sameSettings(prev, data)) return;
    if (hasUnsavedChanges) {
      showToast(
        "The inverter's settings changed — press Read to load them (your edits are kept until then)",
        "info",
      );
      return;
    }
    form.load(data);
    if (isSaveCheck)
      showToast(
        "The inverter reports different settings to what was saved — showing the inverter's values",
        "error",
      );
  }, [query.data]);

  useEffect(() => {
    if (!query.isError) return;
    userRead.current = false;
    showToast(`Read failed: ${(query.error as Error).message}`, "error");
  }, [query.errorUpdatedAt]);

  // `confirmed` skips the prompt when the caller has already asked (Read all).
  const read = ({ confirmed = false }: { confirmed?: boolean } = {}) => {
    if (
      !confirmed &&
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved changes. Read from the inverter and discard them?",
      )
    )
      return;
    const before = query.data;
    userRead.current = true;
    setIsReading(true);
    query
      .refetch({ cancelRefetch: false })
      .then((result) => {
        // Identical data keeps the same reference, so the effect above won't run — load it here.
        if (!result.isError && result.data && result.data === before) {
          userRead.current = false;
          form.load(result.data);
        }
      })
      .finally(() => setIsReading(false));
  };

  // Checks the inverter in the background without locking the card.
  const verify = () => query.refetch({ cancelRefetch: false });

  return {
    read,
    verify,
    hasUnsavedChanges,
    isReading,
    isVerifying: query.isFetching && !isReading,
  };
};

// ─── Battery First ────────────────────────────────────────────────────────────

type SlotForm = ReturnType<typeof useSlotForm>;
type InverterRead = ReturnType<typeof useInverterRead>;

type BatteryFirstProps = {
  form: SlotForm;
  reader: InverterRead;
  setChargePeriodsMutation: ReturnType<
    typeof useGrowatt
  >["setChargePeriodsMutation"];
};

const BatteryFirstCard = ({
  form,
  reader,
  setChargePeriodsMutation,
}: BatteryFirstProps) => {
  const { showToast } = useToast();
  const { read, verify, isReading: isLoading, isVerifying } = reader;
  const isApplying = setChargePeriodsMutation.isPending;
  const isDisabled = isLoading || isApplying;

  useEffect(() => {
    if (setChargePeriodsMutation.isError)
      showToast(
        `Apply failed: ${(setChargePeriodsMutation.error as Error).message}`,
        "error",
      );
    if (setChargePeriodsMutation.isSuccess) {
      showToast("Battery First settings applied", "success");
      verify();
    }
  }, [setChargePeriodsMutation.isError, setChargePeriodsMutation.isSuccess]);

  const handleApply = () => {
    const [p1, p2, p3, p4, p5, p6] = form.toParams();
    setChargePeriodsMutation.mutate({
      powerRate: form.powerRate,
      stopSOC: form.stopSOC,
      slots: [p1, p2, p3, p4, p5, p6],
    });
  };

  return (
    <div
      className={`rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6 transition-opacity ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Battery First</h2>
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Spinner />
              Loading…
            </span>
          )}
          {isApplying && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <Spinner className="text-blue-400" />
              Applying…
            </span>
          )}
          {isVerifying && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Spinner className="text-gray-500" />
              Verifying…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => read()}
            disabled={isDisabled}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Read
          </button>
          <button
            onClick={() =>
              form.setDefaults("35", "95", {
                startHour: "01",
                startMin: "00",
                endHour: "05",
                endMin: "00",
              })
            }
            disabled={isDisabled || !form.isLoaded}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Defaults
          </button>
        </div>
      </div>

      {!form.isLoaded ? (
        <NotReadYet
          isReading={isLoading}
          hint="Press Read to load the current settings."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Charge rate %
              </label>
              <select
                value={form.powerRate}
                onChange={(e) => form.setPowerRate(e.target.value)}
                className={selectClass}
              >
                {RATE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Stop SOC %
              </label>
              <select
                value={form.stopSOC}
                onChange={(e) => form.setStopSOC(e.target.value)}
                className={selectClass}
              >
                {SOC_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SlotList form={form} />

          <button
            onClick={handleApply}
            disabled={isDisabled || !form.isDirty}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:hover:bg-blue-600 disabled:active:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? "Applying…" : "Apply Battery First"}
          </button>
        </>
      )}
    </div>
  );
};

// ─── Grid First ───────────────────────────────────────────────────────────────

type Preset = "high" | "low";
const PRESETS: Record<
  Preset,
  {
    powerRate: string;
    stopSOC: string;
    label: string;
    desc: string;
    defaultSlot: SlotState;
  }
> = {
  high: {
    powerRate: "95",
    stopSOC: "20",
    label: "High Export",
    desc: "95% · stop 20% SOC",
    defaultSlot: {
      startHour: "20",
      startMin: "00",
      endHour: "21",
      endMin: "00",
    },
  },
  low: {
    powerRate: "60",
    stopSOC: "15",
    label: "Low Export",
    desc: "60% · stop 15% SOC",
    defaultSlot: {
      startHour: "20",
      startMin: "00",
      endHour: "21",
      endMin: "00",
    },
  },
};

type GridFirstProps = {
  form: SlotForm;
  reader: InverterRead;
  setDischargeMutation: ReturnType<typeof useGrowatt>["setDischargeMutation"];
};

const GridFirstCard = ({
  form,
  reader,
  setDischargeMutation,
}: GridFirstProps) => {
  const { showToast } = useToast();
  const { read, verify, isReading: isLoading, isVerifying } = reader;
  const isApplying = setDischargeMutation.isPending;
  const isDisabled = isLoading || isApplying;

  useEffect(() => {
    if (setDischargeMutation.isError)
      showToast(
        `GridFirst failed: ${(setDischargeMutation.error as Error).message}`,
        "error",
      );
    if (setDischargeMutation.isSuccess) {
      showToast("GridFirst settings applied", "success");
      verify();
    }
  }, [setDischargeMutation.isError, setDischargeMutation.isSuccess]);

  const handleApply = () => {
    const [p1, p2, p3, p4, p5, p6] = form.toParams();
    setDischargeMutation.mutate({
      powerRate: form.powerRate,
      stopSOC: form.stopSOC,
      p1,
      p2,
      p3,
      p4,
      p5,
      p6,
    });
  };

  return (
    <div
      className={`rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6 transition-opacity ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">GridFirst</h2>
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Spinner />
              Loading…
            </span>
          )}
          {isApplying && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <Spinner className="text-blue-400" />
              Applying…
            </span>
          )}
          {isVerifying && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Spinner className="text-gray-500" />
              Verifying…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => read()}
            disabled={isDisabled}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Read
          </button>
          <button
            onClick={() => form.disableAll("95", "20")}
            disabled={isDisabled || !form.isLoaded}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-700 hover:bg-red-600 disabled:hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>

      {!form.isLoaded ? (
        <NotReadYet
          isReading={isLoading}
          hint="Press Read to load the current settings."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(
              Object.entries(PRESETS) as [Preset, (typeof PRESETS)[Preset]][]
            ).map(([key, p]) => (
              <button
                key={key}
                onClick={() =>
                  form.setDefaults(p.powerRate, p.stopSOC, p.defaultSlot)
                }
                className="rounded-xl px-4 py-3 text-left border border-gray-700 bg-gray-800 hover:border-gray-600 transition-colors"
              >
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Discharge rate %
              </label>
              <select
                value={form.powerRate}
                onChange={(e) => form.setPowerRate(e.target.value)}
                className={selectClass}
              >
                {RATE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Stop SOC %
              </label>
              <select
                value={form.stopSOC}
                onChange={(e) => form.setStopSOC(e.target.value)}
                className={selectClass}
              >
                {SOC_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SlotList form={form} />

          <button
            onClick={handleApply}
            disabled={isDisabled || !form.isDirty}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? "Applying…" : "Apply GridFirst"}
          </button>
        </>
      )}
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

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
        "You have unsaved changes. Read from the inverter and discard them?",
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
          Read all
        </button>
      </div>
      <BatteryFirstCard
        form={chargeForm}
        reader={chargeReader}
        setChargePeriodsMutation={setChargePeriodsMutation}
      />
      <GridFirstCard
        form={dischargeForm}
        reader={dischargeReader}
        setDischargeMutation={setDischargeMutation}
      />
    </div>
  );
};

export default Growatt;
