import { z } from "zod";
import type { FieldErrors } from "../types/Common";

// A form's zod errors as one message per field, for showing under each input.
// Several failed rules on one field (like a weak password) are joined.
const fieldErrors = (error: z.ZodError): FieldErrors =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(
      ([field, messages]) => [field, (messages as string[]).join(". ")],
    ),
  );

export { fieldErrors };
