import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { BatterySoc } from "../../types/Api";

// Reads the battery % now, for Export until battery %. A mutation, not a
// query: it's read once when the user asks, never cached or refetched.
const useBatteryRead = () =>
  useMutation({
    mutationFn: () => apiRequest<BatterySoc>("growatt/battery"),
  });

export default useBatteryRead;
