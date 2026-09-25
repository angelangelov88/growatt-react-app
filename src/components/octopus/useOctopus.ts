import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

const ENDPOINT = import.meta.env.VITE_OCTOPUS_API_ENDPOINT as string;
const apiKey = import.meta.env.VITE_OCTOPUS_API_KEY as string;
const octopusAccount = import.meta.env.VITE_OCTOPUS_ACCOUNT as string;

const octopusRequest = async <T,>(query: string, token?: string): Promise<T> => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
};

const fetchToken = async (): Promise<string> => {
  const data = await octopusRequest<{ obtainKrakenToken: { token: string } }>(
    `mutation { obtainKrakenToken(input: { APIKey: "${apiKey}" }) { token } }`,
  );
  const token = data.obtainKrakenToken?.token;
  if (!token) throw new Error("No token returned from Octopus");
  return token;
};

export default function useOctopus() {
  const tokenMutation = useMutation({ mutationFn: fetchToken });

  const slotsQuery = useQuery({
    queryKey: ["octopus", "slots", tokenMutation.data],
    queryFn: () =>
      octopusRequest<{ plannedDispatches: { startDt: string; endDt: string }[] }>(
        `query { plannedDispatches(accountNumber: "${octopusAccount}") { startDt endDt } }`,
        tokenMutation.data!,
      ),
    enabled: !!tokenMutation.data,
    retry: false,
  });

  const handleAuthAndFetchSlots = async () => {
    await tokenMutation.mutateAsync(undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  };

  return useMemo(
    () => ({
      slotsLoading: tokenMutation.isPending || slotsQuery.isFetching,
      slotsError: tokenMutation.error ?? slotsQuery.error,
      slotsData: slotsQuery.data,
      handleAuthAndFetchSlots,
      formatDate,
    }),
    [tokenMutation.isPending, tokenMutation.error, slotsQuery.isFetching, slotsQuery.error, slotsQuery.data],
  );
}
