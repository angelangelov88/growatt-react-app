import { Link } from "react-router";
import type { Preset } from "../../types/Api";
import type { GridFirstProps } from "../../types/GrowattForm";
import useToast from "../../contexts/useToast";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import NotReadYet from "../../components/NotReadYet";
import SlotList from "./SlotList";
import {
  RATE_OPTIONS,
  SOC_OPTIONS,
  selectClass,
  timeToSlot,
  withCurrent,
} from "./slotOptions";
import useExportPresets from "./useExportPresets";
import useSettings from "../settings/useSettings";
import { GROWATT_RESET } from "../../lib/dailyExport";

const PRESET_KEYS: Preset[] = ["high", "low"];

const GridFirstCard = ({
  form,
  reader,
  setDischargeMutation,
}: GridFirstProps) => {
  const { showToast } = useToast();
  const presets = useExportPresets();
  const isEveryDay = useSettings().data?.exportEveryDay ?? false;
  const { read, verify, isReading: isLoading, isVerifying } = reader;
  const isApplying = setDischargeMutation.isPending;
  const isDisabled = isLoading || isApplying;

  const handleApply = () => {
    setDischargeMutation.mutate(
      {
        powerRate: form.powerRate,
        stopSOC: form.stopSOC,
        slots: form.toParams(),
      },
      {
        onSuccess: () => {
          showToast("Export times applied", "success");
          verify();
        },
        onError: (error) => {
          showToast(`Apply failed: ${error.message}`, "error");
        },
      },
    );
  };

  return (
    <div
      className={`rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6 transition-opacity ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              Export to grid
            </h2>
            <InfoTip label="Export to grid">
              <p>
                Your battery powers your home and sends what&apos;s left to the
                grid during these times. Use it when exporting pays well.
              </p>
              <ul>
                <li>
                  <b>Load</b> shows what&apos;s on your inverter now.
                </li>
                <li>
                  Growatt clears these times every night at {GROWATT_RESET}.
                  With Export every day on in Settings, the times you apply here
                  are put back a few minutes later.
                </li>
                <li>
                  <b>Disable All</b> removes all the times, so the battery
                  won&apos;t export.
                </li>
                <li>
                  <b>The preset buttons</b> fill in your saved times, power and
                  stop level. You can change them in Settings.
                </li>
                <li>
                  <b>Discharge rate</b> is how fast the battery sends power out.{" "}
                  <b>Stop at battery</b> is the level where it stops.
                </li>
              </ul>
              <p>
                Nothing changes on your inverter until you press Apply export
                times.
              </p>
            </InfoTip>
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
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Spinner className="text-emerald-400" />
                Verifying…
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Grid First on your inverter</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              read();
            }}
            disabled={isDisabled}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Load
          </button>
          <button
            onClick={() => {
              form.disableAll("95", "20");
            }}
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
          loadingMessage="Loading settings from your inverter…"
          emptyMessage="Settings not loaded yet"
          hint="Press Load to get the current settings from your inverter."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {PRESET_KEYS.map((key) => {
              const p = presets[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                    form.setDefaults(
                      String(p.powerRate),
                      String(p.stopSOC),
                      timeToSlot(p.start, p.end),
                    );
                  }}
                  className="min-w-0 rounded-xl px-4 py-3 text-left border border-gray-700 bg-gray-800 hover:border-gray-600 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.start}–{p.end} · {p.powerRate}% · stop at {p.stopSOC}%
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 mb-4 text-xs text-gray-500">
            Replaces the slots below.{" "}
            <Link to="/settings" className="text-violet-400 hover:underline">
              Change presets
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Discharge rate %
              </label>
              <select
                value={form.powerRate}
                onChange={(e) => {
                  form.setPowerRate(e.target.value);
                }}
                className={selectClass}
              >
                {withCurrent(RATE_OPTIONS, form.powerRate).map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Stop at battery %
              </label>
              <select
                value={form.stopSOC}
                onChange={(e) => {
                  form.setStopSOC(e.target.value);
                }}
                className={selectClass}
              >
                {withCurrent(SOC_OPTIONS, form.stopSOC).map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SlotList form={form} />

          <p className="-mt-1 mb-4 text-xs text-gray-500">
            {isEveryDay
              ? `Export every day is on: the times you apply here are put back after Growatt clears them at ${GROWATT_RESET}. `
              : `Growatt clears export times every night at ${GROWATT_RESET}. To keep them every day, turn on Export every day in `}
            <Link to="/settings" className="text-violet-400 hover:underline">
              Settings
            </Link>
            .
          </p>

          <button
            onClick={handleApply}
            disabled={isDisabled || !form.isDirty}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? "Applying…" : "Apply export times"}
          </button>
        </>
      )}
    </div>
  );
};

export default GridFirstCard;
