import { useMutation, useQueryClient } from "@tanstack/react-query";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { ME_KEY, clearSessionData } from "./useAuth";

// Ends the session on the server (the cookies are httpOnly, so only the server
// can clear them), then forgets everything cached. The routes then show the
// login page.
const useLogout = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: () => apiRequest("auth/logout", { method: "POST" }),
    onSuccess: () => {
      clearSessionData(queryClient);
      queryClient.setQueryData(ME_KEY, null);
    },
    onError: (error) => {
      showToast(`Couldn't log out: ${error.message}`, "error");
    },
  });
};

export default useLogout;
