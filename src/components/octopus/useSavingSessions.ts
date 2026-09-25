import { useQuery } from "@tanstack/react-query";
import { fetchToken } from "./useOctopus";
import { fetchSavingSessions } from "./savingSessions";

const account = import.meta.env.VITE_OCTOPUS_ACCOUNT as string;

// Loaded on demand with refetch(), like the inverter cards.
export default function useSavingSessions() {
  return useQuery({
    queryKey: ["octopus", "savingSessions"],
    queryFn: async () => fetchSavingSessions(await fetchToken(), account),
    enabled: false,
    retry: false,
    staleTime: Infinity,
  });
}
