import { createContext } from "react";
import type { ToastContextValue } from "../types/Toast";

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

export default ToastContext;
