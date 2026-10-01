import { useRef } from "react";
import { Link } from "react-router";
import FormAlert from "../../components/FormAlert";
import Spinner from "../../components/Spinner";
import ActivityItem from "./ActivityItem";
import { groupByDay } from "./activityDays";
import useActivity from "./useActivity";
import useLoadMoreOnScroll from "./useLoadMoreOnScroll";

// The user's activity log, grouped by day. More loads as they scroll.
const ActivityPage = () => {
  const activity = useActivity();
  const endRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = activity;
  const loadMore = () => {
    void fetchNextPage();
  };
  useLoadMoreOnScroll({
    ref: endRef,
    enabled: hasNextPage && !isFetchingNextPage && !activity.isError,
    onLoad: loadMore,
  });

  const entries = activity.data?.pages.flatMap((page) => page.entries) ?? [];
  const days = groupByDay(entries);

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-strong">Activity</h1>
        <p className="text-sm text-gray-400">
          Important actions on your account from the last 12 months, in UK time.
          If something wasn&apos;t you,{" "}
          <Link to="/settings" className="text-violet-400 hover:underline">
            change your password
          </Link>{" "}
          and{" "}
          <Link to="/contact" className="text-violet-400 hover:underline">
            let us know
          </Link>
          .
        </p>
      </div>

      {activity.isPending && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-gray-400"
        >
          <Spinner />
          Loading…
        </p>
      )}
      {activity.isError && !isFetchingNextPage && (
        <FormAlert message={activity.error.message} />
      )}
      {activity.isSuccess && entries.length === 0 && (
        <p className="text-sm text-gray-400">Nothing yet.</p>
      )}

      {days.map((day) => (
        <section
          key={day.label}
          aria-label={day.label}
          className="rounded-2xl bg-gray-900 border border-gray-800 px-6 py-3"
        >
          <h2 className="pt-2 text-sm font-semibold text-strong">
            {day.label}
          </h2>
          <ul className="divide-y divide-gray-800">
            {day.entries.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ))}

      <div ref={endRef} />
      {isFetchingNextPage && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-gray-400"
        >
          <Spinner />
          Loading more…
        </p>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={loadMore}
          className="self-center px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          Load more
        </button>
      )}
      {activity.isSuccess && entries.length > 0 && !hasNextPage && (
        <p className="text-center text-sm text-gray-500">
          That&apos;s everything from the last 12 months.
        </p>
      )}
    </main>
  );
};

export default ActivityPage;
