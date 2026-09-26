import { useCallback, useMemo, useState, type ReactNode } from "react";
import ToastContext, { type ToastType } from "./ToastContext";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

let nextId = 0;

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm ${
              t.type === "error"
                ? "bg-red-900 border border-red-700 text-red-200"
                : t.type === "success"
                  ? "bg-emerald-900 border border-emerald-700 text-emerald-200"
                  : "bg-gray-800 border border-gray-700 text-gray-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
