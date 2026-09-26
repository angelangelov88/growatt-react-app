import { createContext } from "react";

type ToastType = "error" | "success" | "info";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

export type { ToastType, ToastContextValue };
export default ToastContext;
