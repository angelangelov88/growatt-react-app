import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import useToast from "../../contexts/useToast";
import { ApiRequestError, apiRequest } from "../../lib/apiClient";
import { newPasswordSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { NewPasswordBody, ResetRequestBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import AuthCard from "./AuthCard";
import AuthLink from "./AuthLink";
import useAuth from "./useAuth";

// The server's answers when the login (or the app's code) is over 5 minutes
// old. Someone who forgot their password can't log in again, so they get a new
// link instead.
const STEP_UP_CODES = new Set(["reauth_required", "mfa_required"]);

// Where the reset link lands, already signed in (and past the MFA code, for
// users with an app). The server only accepts a new password within 5 minutes
// of that login.
const ResetPasswordPage = () => {
  const { me } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const change = useMutation({
    mutationFn: (body: NewPasswordBody) =>
      apiRequest("auth/password", { method: "PUT", body }),
    onSuccess: () => {
      showToast(
        "Password changed. Any other devices have been logged out",
        "success",
      );
      void navigate("/", { replace: true });
    },
  });
  const newLink = useMutation({
    mutationFn: (body: ResetRequestBody) =>
      apiRequest<{ message: string }>("auth/password", {
        method: "POST",
        body,
      }),
  });

  const isExpired =
    change.error instanceof ApiRequestError &&
    STEP_UP_CODES.has(change.error.code);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    change.mutate(parsed.data);
  };

  if (isExpired && me?.email) {
    const { email } = me;
    return (
      <AuthCard title="Link timed out">
        <div className="flex flex-col gap-4">
          {newLink.isSuccess ? (
            <FormAlert message={newLink.data.message} tone="success" />
          ) : (
            <>
              {newLink.error && <FormAlert message={newLink.error.message} />}
              <p className="text-sm text-gray-400">
                For your security, a new password has to be chosen within 5
                minutes of opening the link. We can send a new one to{" "}
                <span className="text-gray-200">{email}</span>.
              </p>
              <button
                onClick={() => {
                  newLink.mutate({ email });
                }}
                disabled={newLink.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {newLink.isPending ? "Sending…" : "Send a new link"}
              </button>
            </>
          )}
          <p className="text-sm text-center">
            <AuthLink to="/" disabled={newLink.isPending}>
              Not now
            </AuthLink>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {change.error && <FormAlert message={change.error.message} />}
        {me?.email && (
          <p className="text-sm text-gray-400">
            For <span className="text-gray-200">{me.email}</span>.
          </p>
        )}
        {/* Tells password managers which account the new password is for. */}
        <input
          type="email"
          name="email"
          autoComplete="username"
          value={me?.email ?? ""}
          readOnly
          hidden
        />
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          hint="At least 10 characters, with upper and lowercase letters, a number and a symbol"
          error={errors.password}
          disabled={change.isPending}
          required
        />
        <SubmitButton
          label="Change password"
          pendingLabel="Changing…"
          isPending={change.isPending}
        />
        <p className="text-sm text-center">
          <AuthLink to="/" disabled={change.isPending}>
            Not now
          </AuthLink>
        </p>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
