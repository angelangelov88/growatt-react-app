import { Link } from "react-router";
import type { BatteryFirstProps } from "../../types/GrowattForm";
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
import useChargeSettings from "./useChargeSettings";

const BatteryFirstCard = ({
  form,
  reader,
  setChargePeriodsMutation,
}: BatteryFirstProps) => {
  const { showToast } = useToast();
  const settings = useChargeSettings();
  const { read, verify, isReading: isLoading, isVerifying } = reader;
  const isApplying = setChargePeriodsMutation.isPending;
  const isDisabled = isLoading || isApplying;
  // Automatic charging sets Battery First itself, so it can only be viewed.
  const isAutomatic = settings.automationEnabled;
  const selectDisabledClass = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;

  // The saved battery charging settings. Without the window there are no times to
  // fill in, so the ones in the form stay.
  const { windowEnabled, chargeStart, chargeEnd, powerRate, stopSOC } =
    settings;
  const fillMySettings = () => {
    if (windowEnabled)
      form.setDefaults(
        String(powerRate),
        String(stopSOC),
        timeToSlot(chargeStart, chargeEnd),
      );
    else {
      form.setPowerRate(String(powerRate));
      form.setStopSOC(String(stopSOC));
    }
  };
  // True when the form already shows them, so the button would change nothing.
  const mySlot = timeToSlot(chargeStart, chargeEnd);
  const [onlySlot] = form.slots;
  const hasMySettings =
    form.powerRate === String(powerRate) &&
    form.stopSOC === String(stopSOC) &&
    (!windowEnabled ||
      (form.slots.length === 1 &&
        onlySlot.startHour === mySlot.startHour &&
        onlySlot.startMin === mySlot.startMin &&
        onlySlot.endHour === mySlot.endHour &&
        onlySlot.endMin === mySlot.endMin));

  const handleApply = () => {
    setChargePeriodsMutation.mutate(
      {
        powerRate: form.powerRate,
        stopSOC: form.stopSOC,
        slots: form.toParams(),
      },
      {
        onSuccess: () => {
          showToast("Charge times applied", "success");
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
              Charge battery
            </h2>
            <InfoTip label="Charge battery">
              {isAutomatic ? (
                <p>
                  Your battery charges from the grid during these times.
                  Automatic charging sets them for you, so you can only view
                  them here. <b>Load</b> shows what&apos;s on your inverter now.
                </p>
              ) : (
                <>
                  <p>
                    Your battery charges from the grid during these times. Use
                    it for cheap-rate hours.
                  </p>
                  <ul>
                    <li>
                      <b>Load</b> shows what&apos;s on your inverter now.
                    </li>
                    <li>
                      {windowEnabled ? (
                        <>
                          <b>Apply my settings</b> fills in your saved battery
                          charging settings: {chargeStart}–{chargeEnd},{" "}
                          {powerRate}% power, stop at {stopSOC}%.
                        </>
                      ) : (
                        <>
                          <b>Apply my settings</b> sets your saved {powerRate}%
                          power and stop at {stopSOC}%, and keeps the times.
                        </>
                      )}
                    </li>
                    <li>
                      <b>Charge rate</b> is how fast it charges.{" "}
                      <b>Stop at battery</b> is the level where charging stops.
                    </li>
                  </ul>
                  <p>
                    Nothing changes on your inverter until you press Apply
                    charge times.
                  </p>
                </>
              )}
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
          <p className="text-xs text-gray-500">
            Battery First on your inverter
          </p>
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
            onClick={fillMySettings}
            disabled={
              isDisabled || !form.isLoaded || isAutomatic || hasMySettings
            }
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply my settings
          </button>
        </div>
      </div>

      {isAutomatic && (
        <p className="-mt-2 mb-4 text-xs text-amber-400">
          Automatic charging sets these for you, so you can only view them here.
          To change them yourself,{" "}
          <Link to="/settings" className="text-violet-400 hover:underline">
            turn automatic charging off
          </Link>
          .
        </p>
      )}

      {!form.isLoaded ? (
        <NotReadYet
          isReading={isLoading}
          loadingMessage="Loading settings from your inverter…"
          emptyMessage="Settings not loaded yet"
          hint={
            isAutomatic
              ? "Press Load to see what automatic charging has set on your inverter."
              : "Press Load to get the current settings from your inverter."
          }
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
                onChange={(e) => {
                  form.setPowerRate(e.target.value);
                }}
                disabled={isAutomatic}
                className={selectDisabledClass}
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
                disabled={isAutomatic}
                className={selectDisabledClass}
              >
                {withCurrent(SOC_OPTIONS, form.stopSOC).map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SlotList form={form} readOnly={isAutomatic} />

          {!isAutomatic && (
            <button
              onClick={handleApply}
              disabled={isDisabled || !form.isDirty}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:hover:bg-blue-600 disabled:active:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isApplying ? "Applying…" : "Apply charge times"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default BatteryFirstCard;
