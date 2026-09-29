import type { ActivityDay } from "../../types/Activity";
import type { ActivityEntry } from "../../types/Api";

const UK = "Europe/London";

const dayKey = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: UK });

// "Today", "Yesterday", "Mon 28 Sep", or "Mon 28 Sep 2025" in another year.
const dayLabel = (date: Date, now: Date) => {
  if (dayKey(date) === dayKey(now)) return "Today";
  if (dayKey(date) === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
    return "Yesterday";
  const year = (d: Date) =>
    d.toLocaleDateString("en-GB", { year: "numeric", timeZone: UK });
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: year(date) === year(now) ? undefined : "numeric",
    timeZone: UK,
  });
};

// "14:05", in UK time.
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: UK,
  });

// Groups entries (newest first) by UK day, keeping their order.
const groupByDay = (entries: ActivityEntry[], now = new Date()) =>
  entries.reduce<ActivityDay[]>((days, entry) => {
    const label = dayLabel(new Date(entry.at), now);
    const last = days.length > 0 ? days[days.length - 1] : undefined;
    if (last?.label === label) last.entries.push(entry);
    else days.push({ label, entries: [entry] });
    return days;
  }, []);

export { groupByDay, timeOf };
