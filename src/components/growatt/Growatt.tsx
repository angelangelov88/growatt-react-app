import { useEffect, useState } from "react";
import useGrowatt from "./useGrowatt";
import { useToast } from "../../contexts/ToastContext";
import type { ChargePeriod } from "./growattApi";

const PeriodRow = ({ label, period }: { label: string; period: ChargePeriod }) => (
  <tr className="border-t border-gray-800">
    <td className="py-2 pr-6 text-gray-400 text-sm">{label}</td>
    <td className="py-2 pr-6 text-sm font-mono text-gray-100">{period.start} – {period.end}</td>
    <td className="py-2 text-sm">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${period.enabled ? "bg-emerald-900 text-emerald-300" : "bg-gray-800 text-gray-500"}`}>
        {period.enabled ? "enabled" : "disabled"}
      </span>
    </td>
  </tr>
);

type Preset = "high" | "low";
const PRESETS: Record<Preset, { powerRate: string; stopSOC: string; label: string; desc: string }> = {
  high: { powerRate: "95", stopSOC: "20", label: "High Export", desc: "95% rate · stop at 20% SOC" },
  low:  { powerRate: "60", stopSOC: "15", label: "Low Export",  desc: "60% rate · stop at 15% SOC" },
};

type GridFirstProps = {
  dischargePeriodsQuery: ReturnType<typeof useGrowatt>["dischargePeriodsQuery"];
  setDischargeMutation: ReturnType<typeof useGrowatt>["setDischargeMutation"];
  disableAllDischargeMutation: ReturnType<typeof useGrowatt>["disableAllDischargeMutation"];
};

const GridFirstCard = ({ dischargePeriodsQuery, setDischargeMutation, disableAllDischargeMutation }: GridFirstProps) => {
  const { showToast } = useToast();

  const [preset, setPreset] = useState<Preset>("high");
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("21:10");
  const [stopSOC, setStopSOC] = useState(PRESETS.high.stopSOC);

  useEffect(() => {
    setStopSOC(PRESETS[preset].stopSOC);
  }, [preset]);

  useEffect(() => {
    if (setDischargeMutation.isError) showToast(`GridFirst failed: ${(setDischargeMutation.error as Error).message}`, "error");
    if (setDischargeMutation.isSuccess) showToast("GridFirst settings applied", "success");
  }, [setDischargeMutation.isError, setDischargeMutation.isSuccess]);

  useEffect(() => {
    if (disableAllDischargeMutation.isError) showToast(`Disable failed: ${(disableAllDischargeMutation.error as Error).message}`, "error");
    if (disableAllDischargeMutation.isSuccess) showToast("GridFirst disabled", "success");
  }, [disableAllDischargeMutation.isError, disableAllDischargeMutation.isSuccess]);

  useEffect(() => {
    if (dischargePeriodsQuery.isError) showToast(`Read failed: ${(dischargePeriodsQuery.error as Error).message}`, "error");
  }, [dischargePeriodsQuery.isError]);

  const handleApply = () => {
    const [startHour, startMin] = startTime.split(":");
    const [endHour, endMin] = endTime.split(":");
    setDischargeMutation.mutate({
      powerRate: PRESETS[preset].powerRate,
      stopSOC,
      p1: { startHour, startMin, endHour, endMin },
    });
  };

  const dp = dischargePeriodsQuery.data;
  const isBusy = setDischargeMutation.isPending || disableAllDischargeMutation.isPending;

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">GridFirst</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dischargePeriodsQuery.refetch()}
            disabled={dischargePeriodsQuery.isFetching}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {dischargePeriodsQuery.isFetching ? "Reading…" : "Read Settings"}
          </button>
          <button
            onClick={() => disableAllDischargeMutation.mutate()}
            disabled={isBusy}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {disableAllDischargeMutation.isPending ? "Disabling…" : "Disable All"}
          </button>
        </div>
      </div>

      {/* Preset selector */}
      <div className="flex gap-3 mb-4">
        {(Object.entries(PRESETS) as [Preset, typeof PRESETS[Preset]][]).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`flex-1 rounded-xl px-4 py-3 text-left border transition-colors ${
              preset === key
                ? "border-blue-500 bg-blue-950"
                : "border-gray-700 bg-gray-800 hover:border-gray-600"
            }`}
          >
            <p className="text-sm font-medium text-white">{p.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Time + SOC inputs */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-gray-400 block mb-1">Stop SOC %</label>
          <input
            type="number"
            min="5"
            max="100"
            value={stopSOC}
            onChange={(e) => setStopSOC(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={isBusy}
        className="w-full py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-5"
      >
        {setDischargeMutation.isPending ? "Applying…" : "Apply GridFirst"}
      </button>

      {/* Read data */}
      {dp ? (
        <>
          <div className="flex gap-6 mb-4">
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
              <p className="text-xs text-gray-400 mb-1">Discharge Rate</p>
              <p className="text-2xl font-bold text-white">{dp.powerRate}<span className="text-sm text-gray-400 ml-1">%</span></p>
            </div>
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
              <p className="text-xs text-gray-400 mb-1">Stop SOC</p>
              <p className="text-2xl font-bold text-white">{dp.stopSOC}<span className="text-sm text-gray-400 ml-1">%</span></p>
            </div>
          </div>
          <table className="w-full">
            <tbody>
              <PeriodRow label="Period 1" period={dp.period1} />
              <PeriodRow label="Period 2" period={dp.period2} />
              <PeriodRow label="Period 3" period={dp.period3} />
              <PeriodRow label="Period 4" period={dp.period4} />
              <PeriodRow label="Period 5" period={dp.period5} />
              <PeriodRow label="Period 6" period={dp.period6} />
            </tbody>
          </table>
          <p className="text-xs text-gray-600 font-mono mt-3">{dp.raw}</p>
        </>
      ) : (
        !dischargePeriodsQuery.isFetching && (
          <p className="text-sm text-gray-500">Read settings to view current discharge periods.</p>
        )
      )}

      {dischargePeriodsQuery.isFetching && (
        <p className="text-sm text-gray-400 animate-pulse">Reading from device…</p>
      )}
    </div>
  );
};

const Growatt = () => {
  const { setDefaultsMutation, chargePeriodsQuery, dischargePeriodsQuery, setDischargeMutation, disableAllDischargeMutation } = useGrowatt();
  const { showToast } = useToast();

  useEffect(() => {
    if (setDefaultsMutation.isError) showToast(`Set defaults failed: ${(setDefaultsMutation.error as Error).message}`, "error");
    if (setDefaultsMutation.isSuccess) showToast("Default settings applied", "success");
  }, [setDefaultsMutation.isError, setDefaultsMutation.isSuccess]);

  useEffect(() => {
    if (chargePeriodsQuery.isError) showToast(`Read failed: ${(chargePeriodsQuery.error as Error).message}`, "error");
  }, [chargePeriodsQuery.isError]);

  const cp = chargePeriodsQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Growatt</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => chargePeriodsQuery.refetch()}
              disabled={chargePeriodsQuery.isFetching}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {chargePeriodsQuery.isFetching ? "Reading…" : "Read Settings"}
            </button>
            <button
              onClick={() => setDefaultsMutation.mutate()}
              disabled={setDefaultsMutation.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {setDefaultsMutation.isPending ? "Setting…" : "Set Defaults"}
            </button>
          </div>
        </div>

        {cp ? (
          <>
            <div className="flex gap-6 mb-4">
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-xs text-gray-400 mb-1">Charge Rate</p>
                <p className="text-2xl font-bold text-white">{cp.powerRate}<span className="text-sm text-gray-400 ml-1">%</span></p>
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-xs text-gray-400 mb-1">Stop SOC</p>
                <p className="text-2xl font-bold text-white">{cp.stopSOC}<span className="text-sm text-gray-400 ml-1">%</span></p>
              </div>
            </div>
            <table className="w-full">
              <tbody>
                <PeriodRow label="Period 1" period={cp.period1} />
                <PeriodRow label="Period 2" period={cp.period2} />
                <PeriodRow label="Period 3" period={cp.period3} />
                <PeriodRow label="Period 4" period={cp.period4} />
                <PeriodRow label="Period 5" period={cp.period5} />
                <PeriodRow label="Period 6" period={cp.period6} />
              </tbody>
            </table>
            <p className="text-xs text-gray-600 font-mono mt-3">{cp.raw}</p>
          </>
        ) : (
          !chargePeriodsQuery.isFetching && (
            <p className="text-sm text-gray-500">Read settings to view current charge periods.</p>
          )
        )}

        {chargePeriodsQuery.isFetching && (
          <p className="text-sm text-gray-400 animate-pulse">Reading from device…</p>
        )}
      </div>

      <GridFirstCard
        dischargePeriodsQuery={dischargePeriodsQuery}
        setDischargeMutation={setDischargeMutation}
        disableAllDischargeMutation={disableAllDischargeMutation}
      />
    </div>
  );
};

export default Growatt;
