import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import { apiRequest } from "../../lib/apiClient";
import type { MfaBody } from "../../types/Api";
import type { MfaTurnOffProps } from "../../types/Settings";
import { ME_KEY } from "../auth/useAuth";
import useCodeForm from "./useCodeForm";

// Removing the authenticator app. The server only allows it within 5 minutes
// of entering a code, so this asks for one and sends it first.
const MfaTurnOff = ({ onDone, onCancel }: MfaTurnOffProps) => {
  const queryClient = useQueryClient();
  const turnOff = useMutation({
    mutationFn: async (body: MfaBody) => {
      await apiRequest("auth/mfa", { method: "POST", body });
      await apiRequest("auth/mfa", { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      onDone();
    },
  });
  const { code, setCode, error, handleSubmit } = useCodeForm(turnOff.mutate);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      <p className="text-sm text-gray-300">
        Enter a code from your authenticator app to turn it off. After that,
        your password or Google account is all it takes to log in.
      </p>
      {turnOff.error && <FormAlert message={turnOff.error.message} />}
      <CodeField
        value={code}
        onChange={setCode}
        error={error}
        autoFocus
        disabled={turnOff.isPending}
      />
      <SubmitButton
        label="Turn off"
        pendingLabel="Turning off…"
        isPending={turnOff.isPending}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={turnOff.isPending}
        className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
};

export default MfaTurnOff;
