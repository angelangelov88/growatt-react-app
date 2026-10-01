import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import PasswordField from "../../components/PasswordField";
import TextField from "../../components/TextField";
import Spinner from "../../components/Spinner";
import useToast from "../../contexts/useToast";
import { ApiRequestError, apiRequest } from "../../lib/apiClient";
import { deleteAccountSchema, mfaSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { DeleteAccountBody, MfaBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { DeleteAccountFormProps } from "../../types/Settings";
import GoogleButton from "../auth/GoogleButton";
import useAuth, { ME_KEY, clearSessionData } from "../auth/useAuth";

const CONFIRM_WORD = "DELETE";

// Deletes the account for good. Asks for the word DELETE, and for proof it's
// really the user in the same ways as changing the password.
const DeleteAccountForm = ({ onCancel }: DeleteAccountFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { me } = useAuth();
  const hasMfa = me?.mfaEnrolled ?? false;
  const needsCurrent = (me?.hasPassword ?? false) && !hasMfa;

  const [confirmWord, setConfirmWord] = useState("");
  const [myPassword, setMyPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const remove = useMutation({
    mutationFn: async ({
      body,
      verify,
    }: {
      body: DeleteAccountBody;
      verify?: MfaBody;
    }) => {
      if (verify)
        await apiRequest("auth/mfa", { method: "POST", body: verify });
      await apiRequest("account", { method: "DELETE", body });
    },
    // The server has cleared the cookies. With me null, the routes show the
    // login page.
    onSuccess: () => {
      clearSessionData(queryClient);
      queryClient.setQueryData(ME_KEY, null);
      showToast("Your account has been deleted", "success");
    },
  });
  // A Google user whose login is over 5 minutes old: they log in again.
  const needsGoogle =
    remove.error instanceof ApiRequestError &&
    remove.error.code === "reauth_required";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isConfirmed = confirmWord.trim().toUpperCase() === CONFIRM_WORD;
    const bodyCheck = deleteAccountSchema.safeParse(
      needsCurrent ? { currentPassword: myPassword } : {},
    );
    const codeCheck = hasMfa
      ? mfaSchema.safeParse({ action: "verify", code: code.trim() })
      : null;
    setErrors({
      ...(isConfirmed ? {} : { confirm: `Type ${CONFIRM_WORD} to confirm` }),
      ...(bodyCheck.success ? {} : fieldErrors(bodyCheck.error)),
      ...(codeCheck && !codeCheck.success ? fieldErrors(codeCheck.error) : {}),
    });
    if (!isConfirmed || !bodyCheck.success || (codeCheck && !codeCheck.success))
      return;
    remove.mutate({ body: bodyCheck.data, verify: codeCheck?.data });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      {needsGoogle ? (
        <div className="flex flex-col gap-3">
          <FormAlert message="For your security, log in with Google again first. You'll come back here." />
          <GoogleButton next="settings" label="Log in with Google again" />
        </div>
      ) : (
        remove.error && <FormAlert message={remove.error.message} />
      )}
      <TextField
        id="delete-confirm"
        label={`Type ${CONFIRM_WORD} to confirm`}
        autoComplete="off"
        spellCheck={false}
        autoFocus
        value={confirmWord}
        onChange={(e) => {
          setConfirmWord(e.target.value);
        }}
        error={errors.confirm}
        disabled={remove.isPending}
        required
      />
      {needsCurrent && (
        <>
          {/* Tells password managers which account the password is for. */}
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={me?.email ?? ""}
            readOnly
            hidden
          />
          <PasswordField
            id="current-password"
            label="Your password"
            hint="To confirm it's you"
            autoComplete="current-password"
            value={myPassword}
            onChange={(e) => {
              setMyPassword(e.target.value);
            }}
            error={errors.currentPassword}
            disabled={remove.isPending}
            required
          />
        </>
      )}
      {hasMfa && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-gray-400">
            To confirm it&apos;s you, enter a code from your authenticator app.
          </p>
          <CodeField
            value={code}
            onChange={setCode}
            error={errors.code}
            disabled={remove.isPending}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={remove.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
      >
        {remove.isPending && <Spinner className="text-white" />}
        {remove.isPending ? "Deleting…" : "Delete my account"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={remove.isPending}
        className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
};

export default DeleteAccountForm;
