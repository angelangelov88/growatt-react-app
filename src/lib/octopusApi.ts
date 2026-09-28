import type { GraphQLResponse } from "../types/GraphQL";

// Octopus's public GraphQL API (Kraken). Kept free of React: the server uses it.
// Inputs always go in variables, never into the query text, so a crafted value
// can't change the query.

const OCTOPUS_ENDPOINT = "https://api.octopus.energy/v1/graphql/";

const octopusRequest = async <T>(
  query: string,
  variables: Record<string, string>,
  token?: string,
): Promise<T> => {
  const res = await fetch(OCTOPUS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("No data returned from Octopus");
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
  if (!token) throw new Error("No token returned from Octopus");
  return token;
};

// Throws unless the token's owner can see this account.
const checkAccount = async (token: string, account: string) => {
  const data = await octopusRequest<{ account: { number: string } | null }>(
    `query Account($account: String!) {
      account(accountNumber: $account) { number }
    }`,
    { account },
    token,
  );
  if (data.account?.number !== account) throw new Error("Account not found");
};

export { octopusRequest, obtainToken, checkAccount };
