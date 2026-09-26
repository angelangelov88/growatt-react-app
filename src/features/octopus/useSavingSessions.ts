import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchToken } from "./useOctopus";
import { fetchSavingSessions, joinSession } from "../../lib/savingSessions";

const account = import.meta.env.VITE_OCTOPUS_ACCOUNT;

// Loaded on demand with refetch(), like the inverter cards.
const useSavingSessions = () =>
  useQuery({
    queryKey: ["octopus", "savingSessions"],
    queryFn: async () => fetchSavingSessions(await fetchToken(), account),
    enabled: false,
    retry: false,
    staleTime: Infinity,
  });

// The caller reloads the sessions on success (refetchQueries skips disabled queries).
const useJoinSession = () =>
  useMutation({
    mutationFn: async (eventCode: string) =>
      joinSession(await fetchToken(), account, eventCode),
  });

export { useJoinSession };
export default useSavingSessions;
