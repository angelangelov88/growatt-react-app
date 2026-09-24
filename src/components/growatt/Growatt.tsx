import { useEffect } from "react";
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

const Growatt = () => {
  const { isLoggedIn, loginMutation, setDefaultsMutation, chargePeriodsQuery } = useGrowatt();
  const { showToast } = useToast();

  useEffect(() => {
    if (loginMutation.isError) showToast(`Login failed: ${(loginMutation.error as Error).message}`, "error");
  }, [loginMutation.isError]);

  useEffect(() => {
    if (setDefaultsMutation.isError) showToast(`Set defaults failed: ${(setDefaultsMutation.error as Error).message}`, "error");
    if (setDefaultsMutation.isSuccess) showToast("Default settings applied", "success");
  }, [setDefaultsMutation.isError, setDefaultsMutation.isSuccess]);

  useEffect(() => {
    if (chargePeriodsQuery.isError) showToast(`Read failed: ${(chargePeriodsQuery.error as Error).message}`, "error");
  }, [chargePeriodsQuery.isError]);

  const cp = chargePeriodsQuery.data;

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">Growatt</h2>
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <button
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loginMutation.isPending ? "Logging in…" : "Login"}
            </button>
          ) : (
            <span className="text-xs text-emerald-400 font-medium">● Connected</span>
          )}
          <button
            onClick={() => chargePeriodsQuery.refetch()}
            disabled={!isLoggedIn || chargePeriodsQuery.isFetching}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {chargePeriodsQuery.isFetching ? "Reading…" : "Read Settings"}
          </button>
          <button
            onClick={() => setDefaultsMutation.mutate()}
            disabled={!isLoggedIn || setDefaultsMutation.isPending}
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
          <p className="text-sm text-gray-500">Login and read settings to view current charge periods.</p>
        )
      )}

      {chargePeriodsQuery.isFetching && (
        <p className="text-sm text-gray-400 animate-pulse">Reading from device…</p>
      )}
    </div>
  );
};

export default Growatt;
