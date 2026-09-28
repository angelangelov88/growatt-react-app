import type { GraphQLResponse } from "../types/GraphQL";
import type { Dispatch } from "../types/Octopus";

// Octopus's GraphQL APIs (Kraken). Kept free of React: the server uses it.
// Inputs always go in variables, never into the query text, so a crafted value
// can't change the query.

const OCTOPUS_ENDPOINT = "https://api.octopus.energy/v1/graphql/";

// An error Octopus itself returned, so its message is safe to show. Anything
// else (a timeout, a network error, an HTML error page) is a plain Error.
class OctopusError extends Error {}

const octopusRequest = async <T>(
  query: string,
  variables: Record<string, unknown>,
  {
    token,
    endpoint = OCTOPUS_ENDPOINT,
  }: { token?: string; endpoint?: string } = {},
): Promise<T> => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new OctopusError(json.errors[0].message);
  if (!json.data) throw new OctopusError("No data returned from Octopus");
  return json.data;
};

// Swaps an API key for a short-lived token. Throws if Octopus rejects the key.
const obtainToken = async (apiKey: string) => {
  const data = await octopusRequest<{
    obtainKrakenToken: { token: string } | null;
  }>(
    `mutation ObtainToken($apiKey: String!) {
      obtainKrakenToken(input: { APIKey: $apiKey }) { token }
    }`,
    { apiKey },
  );
  const token = data.obtainKrakenToken?.token;
  if (!token) throw new OctopusError("No token returned from Octopus");
  return token;
};

// Throws unless the token's owner can see this account.
const checkAccount = async (token: string, account: string) => {
  const data = await octopusRequest<{ account: { number: string } | null }>(
    `query Account($account: String!) {
      account(accountNumber: $account) { number }
    }`,
    { account },
    { token },
  );
  if (data.account?.number !== account)
    throw new OctopusError("Account not found");
};

// Intelligent Octopus's planned charging slots for the account.
const fetchPlannedDispatches = async (token: string, account: string) => {
  const data = await octopusRequest<{ plannedDispatches: Dispatch[] | null }>(
    `query PlannedDispatches($account: String!) {
      plannedDispatches(accountNumber: $account) { startDt endDt }
    }`,
    { account },
    { token },
  );
  return data.plannedDispatches ?? [];
};

export {
  OctopusError,
  octopusRequest,
  obtainToken,
  checkAccount,
  fetchPlannedDispatches,
};
