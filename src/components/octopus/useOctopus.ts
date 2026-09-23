import { useMemo, useState } from "react";
import { gql, useMutation, useLazyQuery } from "@apollo/client";

function useOctopus() {
  const octopusAccount = import.meta.env.VITE_OCTOPUS_ACCOUNT;
  const apiKey = import.meta.env.VITE_OCTOPUS_API_KEY;
  const [token, setToken] = useState("");

  const AUTH = gql`
    mutation getAuth($APIKey: String!) {
      obtainKrakenToken(input: { APIKey: $APIKey }) {
        token
        refreshToken
        refreshExpiresIn
      }
    }
  `;

  const GET_SLOTS = gql`
    query getSlots {
      plannedDispatches(accountNumber: "${octopusAccount}") {
        startDt
        endDt
      }
    }
  `;

  const [
    getSlots,
    { loading: slotsLoading, error: slotsError, data: slotsData },
  ] = useLazyQuery(GET_SLOTS, {
    fetchPolicy: "network-only",
    context: {
      headers: {
        Authorization: `${token}`,
      },
    },
  });

  const [
    getAuth,
    { data: authData, loading: authLoading, error: authError },
  ] = useMutation(AUTH);

  const handleAuth = async () => {
    try {
      const response = await getAuth({ variables: { APIKey: apiKey } });
      setToken(response?.data?.obtainKrakenToken?.token);
    } catch (err) {
      console.error("Error executing AUTH mutation:", err);
    }
  };

  const handleAuthAndFetchSlots = async () => {
    try {
      const authResponse = await getAuth({ variables: { APIKey: apiKey } });
      const newToken = authResponse?.data?.obtainKrakenToken?.token;

      if (newToken) {
        setToken(newToken);
        const slotsResponse = await getSlots();
        console.log("Slots Data:", slotsResponse.data);
      }
    } catch (e) {
      console.error("Error fetching auth or slots data:", e);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${formattedDate} - ${formattedTime}`;
  };

  return useMemo(
    () => ({
      authLoading,
      authError,
      authData,
      slotsLoading,
      slotsError,
      slotsData,
      handleAuth,
      handleAuthAndFetchSlots,
      formatDate,
    }),
    [
      authLoading,
      authError,
      authData,
      slotsLoading,
      slotsError,
      slotsData,
      handleAuth,
      handleAuthAndFetchSlots,
      formatDate,
    ],
  );
}

export default useOctopus;
