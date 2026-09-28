import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { Credentials } from "../../types/Api";

const CREDENTIALS_KEY = ["credentials"];

// Which Growatt and Octopus logins are saved, and when they were checked.
// Never the secrets.
const useCredentials = () =>
  useQuery({
    queryKey: CREDENTIALS_KEY,
    queryFn: () => apiRequest<Credentials>("credentials"),
  });

export default useCredentials;
export { CREDENTIALS_KEY };
