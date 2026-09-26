import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { GraphQLResponse } from "../../types/GraphQL";
import useToast from "../../contexts/useToast";

const ENDPOINT = import.meta.env.VITE_OCTOPUS_API_ENDPOINT;
const apiKey = import.meta.env.VITE_OCTOPUS_API_KEY;
const octopusAccount = import.meta.env.VITE_OCTOPUS_ACCOUNT;

const octopusRequest = async <T>(query: string, token?: string): Promise<T> => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("No data returned from Octopus");
  return json.data;
};

const fetchToken = async (): Promise<string> => {
  const data = await octopusRequest<{
    obtainKrakenToken: { token: string } | null;
  }>(
    `mutation { obtainKrakenToken(input: { APIKey: "${apiKey}" }) { token } }`,
  );
  const token = data.obtainKrakenToken?.token;
  if (!token) throw new Error("No token returned from Octopus");
  return token;
};

const useOctopus = () => {
  const { showToast } = useToast();
  const tokenMutation = useMutation({
    mutationFn: fetchToken,
    onError: (error) => {
      showToast(`Octopus error: ${error.message}`, "error");
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["octopus", "slots", tokenMutation.data],
    queryFn: () =>
      octopusRequest<{
        plannedDispatches: { startDt: string; endDt: string }[];
      }>(
        `query { plannedDispatches(accountNumber: "${octopusAccount}") { startDt endDt } }`,
        tokenMutation.data,
      ),
    enabled: !!tokenMutation.data,
    retry: false,
  });

  // Token errors are toasted in onError and slot errors via slotsError, so mutate
  // (which never rejects) is enough.
  const handleAuthAndFetchSlots = () => {
    tokenMutation.mutate(undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Europe/London" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" })}`;
  };

  return useMemo(
    () => ({
      slotsLoading: tokenMutation.isPending || slotsQuery.isFetching,
      // Queries have no onError, so the caller toasts these. errorUpdatedAt changes on
      // every failure, even when the error is the same.
      slotsError: slotsQuery.error,
      slotsErrorUpdatedAt: slotsQuery.errorUpdatedAt,
      slotsData: slotsQuery.data,
      handleAuthAndFetchSlots,
      formatDate,
    }),
    [
      tokenMutation.isPending,
      slotsQuery.isFetching,
      slotsQuery.error,
      slotsQuery.errorUpdatedAt,
      slotsQuery.data,
    ],
  );
};

export { fetchToken };
export default useOctopus;
