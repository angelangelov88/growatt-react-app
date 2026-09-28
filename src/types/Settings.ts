import type { MfaEnrollment } from "./Api";

type MfaSetupProps = {
  enrollment: MfaEnrollment;
  onDone: () => void;
  onCancel: () => void;
};

type MfaTurnOffProps = { onDone: () => void; onCancel: () => void };

export type { MfaSetupProps, MfaTurnOffProps };
