type SpinnerProps = { className?: string };

type NotReadYetProps = {
  isReading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  hint: string;
};

export type { SpinnerProps, NotReadYetProps };
