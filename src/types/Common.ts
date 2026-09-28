type SpinnerProps = { className?: string };

type NotReadYetProps = {
  isReading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  hint: string;
};

// A form's problems: one message per field, by field name.
type FieldErrors = Partial<Record<string, string>>;

export type { SpinnerProps, NotReadYetProps, FieldErrors };
