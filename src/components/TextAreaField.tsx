import type { TextAreaFieldProps } from "../types/Common";

// TextField's look and error handling, for longer text.
const TextAreaField = ({
  id,
  label,
  hint,
  error,
  ...textareaProps
}: TextAreaFieldProps) => {
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
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-xl bg-gray-800 border px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-700" : "border-gray-700"
        }`}
        {...textareaProps}
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
};

export default TextAreaField;
