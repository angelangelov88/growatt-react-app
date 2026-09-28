import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import { apiRequest } from "../../lib/apiClient";
import { resetRequestSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { ResetRequestBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import AuthCard from "./AuthCard";
import AuthLink from "./AuthLink";

// Asks for a reset link. The link signs the user in and opens /reset-password.
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // The server gives the same answer whether or not the email has an account,
  // so all this can say is to check the inbox.
  const request = useMutation({
    mutationFn: (body: ResetRequestBody) =>
      apiRequest<{ message: string }>("auth/password", {
        method: "POST",
        body,
      }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = resetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    request.mutate(parsed.data);
  };

  if (request.isSuccess)
    return (
      <AuthCard title="Check your email">
        <div className="flex flex-col gap-4">
          <FormAlert message={request.data.message} tone="success" />
          <p className="text-sm text-gray-400">
            The link works once, for an hour. If nothing arrives, check your
            spam folder, or try again in a few minutes.
          </p>
          <p className="text-sm text-center">
            <AuthLink to="/login">Back to log in</AuthLink>
          </p>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title="Reset your password">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {request.error && <FormAlert message={request.error.message} />}
        <p className="text-sm text-gray-400">
          Enter the email you log in with, and we&apos;ll send you a link to
          choose a new password.
        </p>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          error={errors.email}
          disabled={request.isPending}
          required
        />
        <SubmitButton
          label="Send link"
          pendingLabel="Sending…"
          isPending={request.isPending}
        />
        <p className="text-sm text-center">
          <AuthLink to="/login" disabled={request.isPending}>
            Back to log in
          </AuthLink>
        </p>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
