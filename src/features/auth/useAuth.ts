import { hashKey, queryOptions, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ApiRequestError, apiRequest } from "../../lib/apiClient";
import type { Me } from "../../types/Api";
import type { AuthStatus } from "../../types/Auth";

const ME_KEY = ["auth", "me"];

// Who is logged in, or null. Refetched when the window regains focus, so an
// expired session sends the user to the login page.
const meQueryOptions = queryOptions({
  queryKey: ME_KEY,
  queryFn: async () => {
    try {
      return await apiRequest<Me>("auth/me");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) return null;
      throw err;
    }
  },
  staleTime: 60_000,
});

// Drops everything cached for the previous session, so one user never sees
// another's data. The me query stays: the routes are watching it, and a
// removed query would leave them stuck on its old answer. Callers update it.
const clearSessionData = (queryClient: QueryClient) => {
  const meHash = hashKey(ME_KEY);
  queryClient.removeQueries({
    predicate: (query) => query.queryHash !== meHash,
  });
};

// After logging in: asks who is logged in now. The routes then send the user
// to the right page.
const resetSession = async (queryClient: QueryClient) => {
  clearSessionData(queryClient);
  await queryClient.query({ ...meQueryOptions, staleTime: 0 });
};

const statusOf = (me: Me | null): AuthStatus => {
  if (!me) return "signedOut";
  if (me.mfaEnrolled && me.aal !== "aal2") return "needsMfa";
  return "signedIn";
};

const useAuth = () => {
  const query = useQuery(meQueryOptions);
  // A failed refetch keeps the last answer rather than hiding the app.
  const status: AuthStatus =
    query.data === undefined
      ? query.isError
        ? "error"
        : "loading"
      : statusOf(query.data);
  return {
    me: query.data ?? null,
    status,
    retry: () => void query.refetch(),
    isRetrying: query.isFetching,
  };
};

export { ME_KEY, clearSessionData, meQueryOptions, resetSession };
export default useAuth;
