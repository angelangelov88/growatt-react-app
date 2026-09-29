import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { ActivityPage } from "../../types/Api";

const ACTIVITY_KEY = ["activity"];

// The activity log, 50 entries a page, newest first. Always refetched when the
// page opens, so it shows what just happened.
const useActivity = () =>
  useInfiniteQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: ({ pageParam }) =>
      apiRequest<ActivityPage>(
        `account?view=activity${pageParam ? `&before=${pageParam}` : ""}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    staleTime: 0,
  });

export default useActivity;
