import { createContext, useContext, useState, useCallback } from "react";

// ── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

const STYLES = {
  success: "bg-lime    text-ink  border-ink",
  error:   "bg-danger  text-white border-ink",
  info:    "bg-cobalt  text-white border-ink",
  warn:    "bg-gold    text-ink  border-ink",
};

let _toastId = 0;

// ── Provider (wrap App with this in main.jsx) ─────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              border-2 shadow-hard px-5 py-3 font-semibold text-sm min-w-[220px]
              animate-[slideIn_.2s_ease_forwards]
              ${STYLES[toast.type] ?? STYLES.info}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook — call this anywhere to show a toast ─────────────────────────────────
// Usage: const toast = useToast();  toast("Saved!", "success");
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Default export is just a placeholder so App.jsx import doesn't break ──────
// The real rendering happens inside ToastProvider above.
export default function Toast() { return null; }