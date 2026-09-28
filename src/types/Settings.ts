import type { MfaEnrollment } from "./Api";

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

export type { MfaSetupProps, MfaTurnOffProps, PasswordFormProps };
