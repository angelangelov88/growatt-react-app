import type { InputHTMLAttributes, ReactNode } from "react";

// Where the user is in logging in, from GET /api/auth/me.
// needsMfa: logged in with a password or Google, but they have an
// authenticator app and haven't entered its code yet.
type AuthStatus = "loading" | "error" | "signedOut" | "needsMfa" | "signedIn";

type AuthRouteProps = { allow: AuthStatus[] };

type AuthCardProps = { title: string; children: ReactNode };

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  isPending: boolean;
};

type FormAlertProps = { message: string; tone?: "error" | "success" };

type ServerUnavailableProps = { onRetry: () => void; isRetrying: boolean };

export type {
  AuthStatus,
  AuthRouteProps,
  AuthCardProps,
  TextFieldProps,
  SubmitButtonProps,
  FormAlertProps,
  ServerUnavailableProps,
};
