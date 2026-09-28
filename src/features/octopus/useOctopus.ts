import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { OctopusSlots } from "../../types/Api";

const useOctopus = () => {
  // Loaded on demand with refetch(), like the inverter cards.
  const slotsQuery = useQuery({
    queryKey: ["octopus", "slots"],
    queryFn: () => apiRequest<OctopusSlots>("octopus/slots"),
    enabled: false,
    retry: false,
  });

  // refetch never rejects; errors come through slotsError.
  const fetchSlots = () => {
    void slotsQuery.refetch({ cancelRefetch: false });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Europe/London" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" })}`;
  };

  return {
    slotsLoading: slotsQuery.isFetching,
    // Queries have no onError, so the caller toasts these. errorUpdatedAt changes on
    // every failure, even when the error is the same.
    slotsError: slotsQuery.error,
    slotsErrorUpdatedAt: slotsQuery.errorUpdatedAt,
    slotsData: slotsQuery.data,
    fetchSlots,
    formatDate,
  };
};

export default useOctopus;
