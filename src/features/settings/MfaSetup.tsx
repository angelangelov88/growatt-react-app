import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import { apiRequest } from "../../lib/apiClient";
import type { MfaBody } from "../../types/Api";
import type { MfaSetupProps } from "../../types/Settings";
import { ME_KEY } from "../auth/useAuth";
import useCodeForm from "./useCodeForm";

// Adding an authenticator app: scan the QR code (or type the key), then enter
// a code from the app to prove it works. Only then is MFA turned on.
const MfaSetup = ({ enrollment, onDone, onCancel }: MfaSetupProps) => {
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: (body: MfaBody) =>
      apiRequest("auth/mfa", { method: "POST", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      onDone();
    },
  });
  const { code, setCode, error, handleSubmit } = useCodeForm(confirm.mutate);
  // In groups of four, which is easier to copy by eye. Apps ignore the spaces.
  const key = enrollment.secret.match(/.{1,4}/g)?.join(" ") ?? "";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      <p className="text-sm text-gray-300">
        1. Scan this QR code with an authenticator app, such as Google
        Authenticator, Microsoft Authenticator or 1Password.
      </p>
      <img
        src={enrollment.qrCode}
        alt="QR code that adds this account to your authenticator app"
        width={176}
        height={176}
        className="self-center rounded-xl bg-white p-2"
      />
      <p className="text-sm text-gray-400">
        Can't scan it? Enter this key in the app instead:
      </p>
      <code className="self-center rounded-lg bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 break-all select-all">
        {key}
      </code>
      <p className="text-sm text-gray-300">
        2. Enter the 6-digit code the app shows.
      </p>
      {confirm.error && <FormAlert message={confirm.error.message} />}
      <CodeField
        value={code}
        onChange={setCode}
        error={error}
        disabled={confirm.isPending}
      />
      <SubmitButton
        label="Turn on"
        pendingLabel="Checking…"
        isPending={confirm.isPending}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={confirm.isPending}
        className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
};

export default MfaSetup;
