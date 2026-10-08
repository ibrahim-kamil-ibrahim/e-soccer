import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: push, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-white border border-[var(--color-border)] rounded-lg py-3 pl-4 pr-3 shadow-2xl shadow-black/10 min-w-[280px] max-w-sm animate-[fadeIn_0.2s_ease]"
          >
            {t.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
            )}
            <span className="text-sm text-[var(--color-text)] flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[#94A3B8] hover:text-[var(--color-text)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
