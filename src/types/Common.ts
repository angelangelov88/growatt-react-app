import type { InputHTMLAttributes, ReactNode } from "react";

type SpinnerProps = { className?: string };

type AppLogoProps = { className?: string };

type NotReadYetProps = {
  isReading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  hint: string;
};

// A form's problems: one message per field, by field name.
type FieldErrors = Partial<Record<string, string>>;

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  // Shown inside the input, at its right edge (e.g. a show-password button).
  trailing?: ReactNode;
};

// The type is chosen by the show/hide button.
type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailing">;

// A 6-digit code from an authenticator app.
type CodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  isPending: boolean;
};

type FormAlertProps = { message: string; tone?: "error" | "success" };

export type {
  SpinnerProps,
  AppLogoProps,
  NotReadYetProps,
  FieldErrors,
  TextFieldProps,
  PasswordFieldProps,
  CodeFieldProps,
  SubmitButtonProps,
  FormAlertProps,
};
