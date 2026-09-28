import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import { apiRequest } from "../../lib/apiClient";
import { mfaSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { MfaBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import AuthCard from "./AuthCard";
import useAuth, { resetSession } from "./useAuth";
import useLogout from "./useLogout";

// The second step of logging in, for users with an authenticator app. Until
// the code is entered, the server refuses everything else.
const MfaPage = () => {
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const logout = useLogout();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const verify = useMutation({
    mutationFn: (body: MfaBody) =>
      apiRequest("auth/mfa", { method: "POST", body }),
    onSuccess: () => resetSession(queryClient),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = mfaSchema.safeParse({ action: "verify", code: code.trim() });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    verify.mutate(parsed.data);
  };

  return (
    <AuthCard title="Enter your code">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {verify.error && <FormAlert message={verify.error.message} />}
        <p className="text-sm text-gray-400">
          Open your authenticator app and enter the 6-digit code for Growatt App
          {me?.email ? ` (${me.email})` : ""}.
        </p>
        <CodeField
          value={code}
          onChange={setCode}
          error={errors.code}
          autoFocus
          disabled={verify.isPending || logout.isPending}
        />
        <SubmitButton
          label="Continue"
          pendingLabel="Checking…"
          isPending={verify.isPending}
        />
        <button
          type="button"
          onClick={() => {
            logout.mutate();
          }}
          disabled={logout.isPending || verify.isPending}
          className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
        >
          Use a different account
        </button>
      </form>
    </AuthCard>
  );
};

export default MfaPage;
