import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import PasswordField from "../../components/PasswordField";
import TextField from "../../components/TextField";
import { apiRequest } from "../../lib/apiClient";
import { loginSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { LoginBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import AuthCard from "./AuthCard";
import AuthLink from "./AuthLink";
import GoogleButton from "./GoogleButton";
import { resetSession } from "./useAuth";

// The ?error= codes the server's redirects use (Google sign-in and email
// links). Unknown codes are ignored, so the URL can't put text on the page.
const LINK_ERRORS = new Map([
  ["sign_in_cancelled", "Google sign-in was cancelled"],
  ["sign_in_failed", "Google sign-in didn't work, try again"],
  ["google_unavailable", "Google sign-in isn't available right now, try later"],
  ["signups_closed", "Kelpwatt's beta is full for now. Try again later"],
  ["rate_limited", "Too many attempts, try again in a few minutes"],
  ["invalid_link", "That link isn't valid"],
  [
    "link_expired",
    "That link has expired or was already used. Log in, or ask for a new one",
  ],
]);

const LoginPage = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const linkError = LINK_ERRORS.get(searchParams.get("error") ?? "") ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: (body: LoginBody) =>
      apiRequest("auth/login", { method: "POST", body }),
    // Waits for the new session, then the routes move on (to the app, or to
    // the MFA code).
    onSuccess: () => resetSession(queryClient),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    login.mutate(parsed.data);
  };

  const alert = login.error?.message ?? linkError;

  return (
    <AuthCard title="Log in">
      <div className="flex flex-col gap-5">
        {alert && <FormAlert message={alert} />}
        <GoogleButton disabled={login.isPending} />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="h-px flex-1 bg-gray-800" />
          or with email
          <span className="h-px flex-1 bg-gray-800" />
        </div>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            error={errors.email}
            disabled={login.isPending}
            required
          />
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            error={errors.password && "Enter your password"}
            disabled={login.isPending}
            required
          />
          <p className="-mt-2 text-sm text-right">
            <AuthLink to="/forgot-password" disabled={login.isPending}>
              Forgot password?
            </AuthLink>
          </p>
          <SubmitButton
            label="Log in"
            pendingLabel="Logging in…"
            isPending={login.isPending}
          />
        </form>
        <p className="text-sm text-gray-400 text-center">
          New here?{" "}
          <AuthLink to="/signup" disabled={login.isPending}>
            Create an account
          </AuthLink>
        </p>
      </div>
    </AuthCard>
  );
};

export default LoginPage;
