import { useEffect } from "react";
import useOctopus from "./useOctopus";
import useApplySlots from "./useApplySlots";
import useToast from "../../contexts/useToast";

const Octopus = () => {
  const {
    slotsLoading,
    slotsError,
    slotsData,
    formatDate,
    handleAuthAndFetchSlots,
  } = useOctopus();
  const {
    applySlots,
    planSummary,
    extraSlotsMessage,
    isPending,
    error: applyError,
  } = useApplySlots({ slotsData });
  const { showToast } = useToast();

  useEffect(() => {
    if (slotsError) showToast(`Octopus error: ${slotsError.message}`, "error");
  }, [slotsError]);

  useEffect(() => {
    if (applyError) showToast(`Apply failed: ${applyError.message}`, "error");
  }, [applyError]);

  useEffect(() => {
    if (extraSlotsMessage) showToast(extraSlotsMessage, "info");
  }, [extraSlotsMessage]);

  const slots = slotsData?.plannedDispatches ?? [];

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">
          Octopus Dispatch Slots
        </h2>
        <button
          onClick={handleAuthAndFetchSlots}
          disabled={slotsLoading}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {slotsLoading ? "Fetching…" : "Fetch Slots"}
        </button>
      </div>

      {slotsData && slots.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">
          No upcoming dispatch slots.
        </p>
      )}

      {slots.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {slots.map((item, index) => (
            <div
              key={`${item.startDt}-${item.endDt}`}
              className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
            >
              <span className="text-xs text-gray-400 font-medium">
                Slot {index + 1}
              </span>
              <span className="text-sm font-mono text-gray-100">
                {formatDate(item.startDt)} → {formatDate(item.endDt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {slotsData && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Will apply (UK time):{" "}
            <span className="font-mono text-gray-200">{planSummary}</span>
          </p>
          <button
            onClick={applySlots}
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Applying…"
              : slots.length > 0
                ? "Apply Slots to Growatt"
                : "Apply Default to Growatt"}
          </button>
        </>
      )}
    </div>
  );
};

export default Octopus;
