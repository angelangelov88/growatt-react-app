import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import { signupSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { SignupBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import AuthCard from "./AuthCard";
import FormAlert from "./FormAlert";
import GoogleButton from "./GoogleButton";
import SubmitButton from "./SubmitButton";
import TextField from "./TextField";

const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // The server gives the same answer whether or not the email already has an
  // account, so all this can say is to check the inbox.
  const signup = useMutation({
    mutationFn: (body: SignupBody) =>
      apiRequest<{ message: string }>("auth/signup", { method: "POST", body }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    signup.mutate(parsed.data);
  };

  if (signup.isSuccess)
    return (
      <AuthCard title="Check your email">
        <div className="flex flex-col gap-4">
          <FormAlert message={signup.data.message} tone="success" />
          <p className="text-sm text-gray-400">
            We&apos;ve sent a link to{" "}
            <span className="text-gray-200">{email}</span>. Open it on any
            device to finish creating your account.
          </p>
          <Link
            to="/login"
            className="text-sm text-violet-400 hover:underline text-center"
          >
            Back to log in
          </Link>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title="Create an account">
      <div className="flex flex-col gap-5">
        {signup.error && <FormAlert message={signup.error.message} />}
        <GoogleButton />
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
            required
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            hint="At least 10 characters, with upper and lowercase letters, a number and a symbol"
            error={errors.password}
            required
          />
          <SubmitButton
            label="Create account"
            pendingLabel="Creating…"
            isPending={signup.isPending}
          />
        </form>
        <p className="text-sm text-gray-400 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-violet-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};

export default SignUpPage;
