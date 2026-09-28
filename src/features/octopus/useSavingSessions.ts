import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { JoinBody, SavingSessions, SessionJson } from "../../types/Api";
import type { PowerDownSession, SavingSessionsData } from "../../types/Octopus";

// The server sends the dates as ISO strings.
const toSession = (s: SessionJson): PowerDownSession => ({
  ...s,
  startAt: new Date(s.startAt),
  endAt: new Date(s.endAt),
});

const fetchSessions = async (): Promise<SavingSessionsData> => {
  const data = await apiRequest<SavingSessions>("octopus/sessions");
  return {
    region: data.region,
    events: data.events.map(toSession),
    joined: data.joined.map(toSession),
  };
};

// Loaded on demand with refetch(), like the inverter cards.
const useSavingSessions = () =>
  useQuery({
    queryKey: ["octopus", "savingSessions"],
    queryFn: fetchSessions,
    enabled: false,
    retry: false,
    staleTime: Infinity,
  });

// The caller reloads the sessions on success (refetchQueries skips disabled queries).
const useJoinSession = () =>
  useMutation({
    mutationFn: (eventCode: string) =>
      apiRequest("octopus/join", {
        method: "POST",
        body: { eventCode } satisfies JoinBody,
      }),
  });

export { useJoinSession };
export default useSavingSessions;
