import { useState } from "react";
import type { FormEvent } from "react";
import { mfaSchema } from "../../lib/authSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { MfaBody } from "../../types/Api";

// A form whose only field is the code from an authenticator app. Checks the
// code's shape before handing it on, so a typo doesn't use up an attempt.
const useCodeForm = (onValid: (body: MfaBody) => void) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = mfaSchema.safeParse({ action: "verify", code: code.trim() });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).code);
      return;
    }
    setError(undefined);
    onValid(parsed.data);
  };

  return { code, setCode, error, handleSubmit };
};

export default useCodeForm;
