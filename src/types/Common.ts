import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

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

// A multi-line TextField, e.g. the contact form's message.
type TextAreaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
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

// The header's menu on small screens: the signed-in user's email and links.
type AccountMenuProps = {
  email: string | null | undefined;
  onLogout: () => void;
  isLoggingOut: boolean;
};

// An ⓘ button that explains a card. label names the card, e.g. "Battery First".
type InfoTipProps = { label: string; children: ReactNode };

export type {
  SpinnerProps,
  AppLogoProps,
  NotReadYetProps,
  FieldErrors,
  TextFieldProps,
  TextAreaFieldProps,
  PasswordFieldProps,
  CodeFieldProps,
  SubmitButtonProps,
  FormAlertProps,
  InfoTipProps,
  AccountMenuProps,
};
