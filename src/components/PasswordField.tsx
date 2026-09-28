import { forwardRef, useState } from "react";
import type { PasswordFieldProps } from "../types/Common";
import TextField from "./TextField";

const EyeIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.7 3.9" />
    <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a10.3 10.3 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m2 2 20 20" />
  </svg>
);

// A password input with a button to show what's been typed. Starts hidden.
const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (props, ref) => {
    const [isShown, setIsShown] = useState(false);
    return (
      <TextField
        ref={ref}
        {...props}
        type={isShown ? "text" : "password"}
        trailing={
          <button
            type="button"
            onClick={() => {
              setIsShown((shown) => !shown);
            }}
            disabled={props.disabled}
            aria-label={isShown ? "Hide password" : "Show password"}
            aria-controls={props.id}
            aria-pressed={isShown}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isShown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />
    );
  },
);
PasswordField.displayName = "PasswordField";

export default PasswordField;
