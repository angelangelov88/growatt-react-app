import { useEffect, useRef } from "react";
import type { CodeFieldProps } from "../types/Common";
import TextField from "./TextField";

// Where the user types the 6-digit code from their authenticator app. Phones
// show a number pad, and can fill it in from the app.
const CodeField = ({
  value,
  onChange,
  error,
  autoFocus = false,
  disabled = false,
}: CodeFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasDisabled = useRef(disabled);

  // Disabling the field while the code is checked takes the focus away. If
  // the code didn't work, put the focus back with the old code selected, so
  // the next one can be typed straight over it.
  useEffect(() => {
    if (wasDisabled.current && !disabled) inputRef.current?.select();
    wasDisabled.current = disabled;
  }, [disabled]);

  // A whole code sends the form, as if the button were pressed. Runs after the
  // render, so the form's submit handler sees the new code. Only when the code
  // changes, so one that just failed isn't sent again.
  useEffect(() => {
    if (/^\d{6}$/.test(value)) inputRef.current?.form?.requestSubmit();
  }, [value]);

  return (
    <TextField
      ref={inputRef}
      id="code"
      label="Code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus={autoFocus}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      error={error}
      required
    />
  );
};

export default CodeField;
