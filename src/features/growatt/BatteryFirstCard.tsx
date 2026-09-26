import type { BatteryFirstProps } from "../../types/GrowattForm";
import useToast from "../../contexts/useToast";
import Spinner from "../../components/Spinner";
import NotReadYet from "./NotReadYet";
import SlotList from "./SlotList";
import { RATE_OPTIONS, SOC_OPTIONS, selectClass } from "./slotOptions";

const BatteryFirstCard = ({
  form,
  reader,
  setChargePeriodsMutation,
}: BatteryFirstProps) => {
  const { showToast } = useToast();
  const { read, verify, isReading: isLoading, isVerifying } = reader;
  const isApplying = setChargePeriodsMutation.isPending;
  const isDisabled = isLoading || isApplying;

  const handleApply = () => {
    const [p1, p2, p3, p4, p5, p6] = form.toParams();
    setChargePeriodsMutation.mutate(
      {
        powerRate: form.powerRate,
        stopSOC: form.stopSOC,
        slots: [p1, p2, p3, p4, p5, p6],
      },
      {
        onSuccess: () => {
          showToast("Battery First settings applied", "success");
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
              form.setDefaults("35", "95", {
                startHour: "01",
                startMin: "00",
                endHour: "05",
                endMin: "00",
              });
            }}
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
          hint="Press Load to get the current settings from your inverter."
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
                Stop at battery %
              </label>
              <select
                value={form.stopSOC}
                onChange={(e) => {
                  form.setStopSOC(e.target.value);
                }}
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

export default BatteryFirstCard;
