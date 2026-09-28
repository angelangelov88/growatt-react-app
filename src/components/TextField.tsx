import { forwardRef } from "react";
import type { TextFieldProps } from "../types/Common";

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ id, label, hint, error, ...inputProps }, ref) => {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint && hintId, error && errorId]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm text-gray-300">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`rounded-xl bg-gray-800 border px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-red-700" : "border-gray-700"
          }`}
          {...inputProps}
        />
        {hint && (
          <p id={hintId} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = "TextField";

export default TextField;
