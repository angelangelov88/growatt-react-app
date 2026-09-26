import type { ReactNode } from "react";

type ToastType = "error" | "success" | "info";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastProviderProps = { children: ReactNode };

export type { ToastType, ToastContextValue, Toast, ToastProviderProps };
