import { useEffect, useState } from "react";
import Spinner from "../Spinner";
import { useToast } from "../../contexts/ToastContext";
import useSavingSessions from "./useSavingSessions";
import {
  joinedInLastDays,
  sessionStatus,
  sessionsToday,
  type PowerDownSession,
} from "./savingSessions";

type Period = "today" | 7 | 30 | 365;

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 365, label: "365 days" },
];

const ukTime = (d: Date) =>
  d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
const ukDay = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/London",
  });

const points = (s: PowerDownSession, now: Date) => {
  if (s.pointsAwarded !== null) return `${s.pointsAwarded} pts`;
  return sessionStatus(s, now) === "ended" ? "pending" : "—";
};

type Props = {
  // Adds the session window to Grid First with High Export settings.
  onExportDuringSession: (session: PowerDownSession) => void;
  exportDisabled: boolean;
};

const PowerDownSessions = ({
  onExportDuringSession,
  exportDisabled,
}: Props) => {
  const { showToast } = useToast();
  const query = useSavingSessions();
  const [period, setPeriod] = useState<Period>("today");
  const now = new Date();

  useEffect(() => {
    if (query.isError)
      showToast(
        `Couldn't load Power Down sessions: ${(query.error as Error).message}`,
        "error",
      );
  }, [query.errorUpdatedAt]);

  const data = query.data;
  const sessions = data
    ? period === "today"
      ? sessionsToday(data, now)
      : joinedInLastDays(data, period, now)
    : [];
  const withPoints = sessions.filter((s) => s.pointsAwarded !== null);

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">
            Power Down Sessions
          </h2>
          {query.isFetching && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Spinner />
              Loading…
            </span>
          )}
        </div>
        <button
          onClick={() => query.refetch({ cancelRefetch: false })}
          disabled={query.isFetching}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 mb-4 rounded-xl bg-gray-800">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriod(p.value)}
            className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p.value
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center">
          {query.isFetching ? (
            <p className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Spinner />
              Loading sessions from Octopus…
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-300">Sessions not loaded yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Press Load to get your Power Down sessions from Octopus.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {period !== "today" && sessions.length > 0 && (
            <p className="text-xs text-gray-400 mb-3">
              {sessions.length} joined ·{" "}
              {withPoints.reduce((sum, s) => sum + (s.pointsAwarded ?? 0), 0)}{" "}
              points · {withPoints.filter((s) => s.pointsAwarded === 0).length}{" "}
              earned 0 · {sessions.length - withPoints.length} pending
            </p>
          )}

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              {period === "today"
                ? "No Power Down sessions today."
                : `No joined sessions in the last ${period} days.`}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((s) => {
                const status = sessionStatus(s, now);
                const canExport =
                  period === "today" && s.joined && status !== "ended";
                return (
                  <div key={s.id} className="bg-gray-800 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-mono text-gray-100">
                          {period !== "today" && (
                            <span className="text-gray-400">
                              {ukDay(s.startAt)} ·{" "}
                            </span>
                          )}
                          {ukTime(s.startAt)}–{ukTime(s.endAt)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.rewardPerKwh !== null
                            ? `${s.rewardPerKwh} pts/kWh`
                            : "rate unknown"}
                          {period === "today" && ` · ${status}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {period === "today" && (
                          <span
                            className={`text-xs font-medium ${s.joined ? "text-emerald-400" : "text-gray-500"}`}
                          >
                            {s.joined ? "Joined" : "Not joined"}
                          </span>
                        )}
                        {s.joined && (
                          <p className="text-xs text-gray-300 mt-0.5">
                            {points(s, now)}
                          </p>
                        )}
                      </div>
                    </div>
                    {canExport && (
                      <button
                        onClick={() => onExportDuringSession(s)}
                        disabled={exportDisabled}
                        className="w-full mt-3 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Export during session
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PowerDownSessions;
