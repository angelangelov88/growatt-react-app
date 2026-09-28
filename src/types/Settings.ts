import type { MfaEnrollment, Provider } from "./Api";

type MfaSetupProps = {
  enrollment: MfaEnrollment;
  onDone: () => void;
  onCancel: () => void;
};

type MfaTurnOffProps = { onDone: () => void; onCancel: () => void };

// onDone gets the message to show.
type PasswordFormProps = {
  onDone: (message: string) => void;
  onCancel: () => void;
};

// onDone gets the message to show.
type CredentialsFormProps = {
  provider: Provider;
  onDone: (message: string) => void;
  onCancel: () => void;
};

// saved is the non-secret part (serial or account number), or null.
type CredentialsRowProps = {
  provider: Provider;
  saved: { identifier: string; verifiedAt: string } | null;
  isEditing: boolean;
  onEdit: () => void;
  onDone: (message: string) => void;
  onCancel: () => void;
};

export type {
  MfaSetupProps,
  MfaTurnOffProps,
  PasswordFormProps,
  CredentialsFormProps,
  CredentialsRowProps,
};
