import useGrowatt from "./useGrowatt";
import type { ChargePeriod } from "./growattApi";

const PeriodRow = ({ label, period }: { label: string; period: ChargePeriod }) => (
  <tr>
    <td className="pr-4 font-medium">{label}</td>
    <td className="pr-4">{period.start} – {period.end}</td>
    <td className={period.enabled ? "text-green-600" : "text-gray-400"}>
      {period.enabled ? "enabled" : "disabled"}
    </td>
  </tr>
);

const Growatt = () => {
  const { isLoggedIn, loginMutation, chargeTimeMutation, chargePeriodsQuery } = useGrowatt();

  const errors = [
    loginMutation.isError && `Login error: ${(loginMutation.error as Error).message}`,
    chargeTimeMutation.isError && `Set charge error: ${(chargeTimeMutation.error as Error).message}`,
    chargePeriodsQuery.isError && `Read error: ${(chargePeriodsQuery.error as Error).message}`,
  ].filter(Boolean);

  const cp = chargePeriodsQuery.data;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Growatt</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => loginMutation.mutate()}
          disabled={loginMutation.isPending || isLoggedIn}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {loginMutation.isPending ? "Logging in..." : isLoggedIn ? "Logged in ✓" : "Login"}
        </button>
        <button
          onClick={() => chargePeriodsQuery.refetch()}
          disabled={!isLoggedIn || chargePeriodsQuery.isFetching}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {chargePeriodsQuery.isFetching ? "Reading..." : "Read Current Settings"}
        </button>
        <button
          onClick={() => chargeTimeMutation.mutate({ p2: { startHour: "01", startMin: "00", endHour: "03", endMin: "00" }, p3: null })}
          disabled={!isLoggedIn || chargeTimeMutation.isPending}
          className="bg-green-300 p-2 rounded-lg disabled:opacity-50"
        >
          {chargeTimeMutation.isPending ? "Setting..." : "Set Charge 01:00–03:00"}
        </button>
      </div>

      {errors.map((e, i) => (
        <p key={i} className="text-red-500 mb-2">{e as string}</p>
      ))}
      {chargeTimeMutation.isSuccess && (
        <p className="text-green-600 mb-2">Charge time set successfully</p>
      )}

      {cp && (
        <>
          <table className="text-sm mb-2">
            <tbody>
              <tr>
                <td className="pr-4 font-medium">Charge power rate</td>
                <td colSpan={2}>{cp.powerRate}%</td>
              </tr>
              <tr>
                <td className="pr-4 font-medium">Charge stop SOC</td>
                <td colSpan={2}>{cp.stopSOC}%</td>
              </tr>
              <PeriodRow label="Period 1" period={cp.period1} />
              <PeriodRow label="Period 2" period={cp.period2} />
              <PeriodRow label="Period 3" period={cp.period3} />
              <PeriodRow label="Period 4" period={cp.period4} />
              <PeriodRow label="Period 5" period={cp.period5} />
              <PeriodRow label="Period 6" period={cp.period6} />
            </tbody>
          </table>
          <p className="text-xs text-gray-400 font-mono">raw: {cp.raw}</p>
        </>
      )}
    </div>
  );
};

export default Growatt;
