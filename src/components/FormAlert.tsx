import type { FormAlertProps } from "../types/Common";

// A message about the whole form, read out by screen readers when it appears.
const FormAlert = ({ message, tone = "error" }: FormAlertProps) => (
  <p
    role={tone === "error" ? "alert" : "status"}
    className={`rounded-xl px-3 py-2 text-sm ${
      tone === "error"
        ? "bg-red-950 border border-red-800 text-red-200"
        : "bg-emerald-950 border border-emerald-800 text-emerald-200"
    }`}
  >
    {message}
  </p>
);

export default FormAlert;
