import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import PasswordField from "../../components/PasswordField";
import SubmitButton from "../../components/SubmitButton";
import { ApiRequestError, apiRequest } from "../../lib/apiClient";
import {
  changePasswordSchema,
  mfaSchema,
  newPasswordSchema,
} from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { MfaBody, NewPasswordBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { PasswordFormProps } from "../../types/Settings";
import GoogleButton from "../auth/GoogleButton";
import useAuth, { ME_KEY } from "../auth/useAuth";

// Changing the password, or adding one for a Google user. The server wants
// proof it's really the user: a code from their app if they have MFA,
// otherwise their current password, or (with none yet) a login in the last 5
// minutes.
const PasswordForm = ({ onDone, onCancel }: PasswordFormProps) => {
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const hasPassword = me?.hasPassword ?? false;
  const hasMfa = me?.mfaEnrolled ?? false;
  const needsCurrent = hasPassword && !hasMfa;

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: async ({
      body,
      verify,
    }: {
      body: NewPasswordBody;
      verify?: MfaBody;
    }) => {
      if (verify)
        await apiRequest("auth/mfa", { method: "POST", body: verify });
      await apiRequest("auth/password", { method: "PUT", body });
    },
    onSuccess: async () => {
      const message = hasPassword
        ? "Password changed. Any other devices have been logged out"
        : "Password added. You can now also log in with your email";
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      onDone(message);
    },
  });
  // A Google user whose login is over 5 minutes old: they log in again.
  const needsGoogle =
    save.error instanceof ApiRequestError &&
    save.error.code === "reauth_required";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordCheck = needsCurrent
      ? changePasswordSchema.safeParse({ currentPassword, password })
      : newPasswordSchema.safeParse({ password });
    const codeCheck = hasMfa
      ? mfaSchema.safeParse({ action: "verify", code: code.trim() })
      : null;
    setErrors({
      ...(passwordCheck.success ? {} : fieldErrors(passwordCheck.error)),
      ...(codeCheck && !codeCheck.success ? fieldErrors(codeCheck.error) : {}),
    });
    if (!passwordCheck.success || (codeCheck && !codeCheck.success)) return;
    save.mutate({ body: passwordCheck.data, verify: codeCheck?.data });
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
        save.error && <FormAlert message={save.error.message} />
      )}
      {/* Tells password managers which account the password is for. */}
      <input
        type="email"
        name="email"
        autoComplete="username"
        value={me?.email ?? ""}
        readOnly
        hidden
      />
      {needsCurrent && (
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          autoFocus
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
          }}
          error={errors.currentPassword}
          disabled={save.isPending}
          required
        />
      )}
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        autoFocus={!needsCurrent}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        hint="At least 10 characters, with upper and lowercase letters, a number and a symbol"
        error={errors.password}
        disabled={save.isPending}
        required
      />
      {hasMfa && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-gray-400">
            To confirm it&apos;s you, enter a code from your authenticator app.
          </p>
          <CodeField
            value={code}
            onChange={setCode}
            error={errors.code}
            disabled={save.isPending}
          />
        </div>
      )}
      <SubmitButton
        label={hasPassword ? "Change password" : "Add password"}
        pendingLabel="Saving…"
        isPending={save.isPending}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={save.isPending}
        className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
};

export default PasswordForm;
