"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Sparkles, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Función utilitaria para emitir un Toast global desde cualquier parte del código
 * sin requerir el hook de React (por ejemplo en callbacks o servicios).
 */
export function emitGlobalToast(type: ToastType, message: string, duration = 4500) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gimnasiodb:toast", {
        detail: { type, message, duration },
      })
    );
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast("success", message, duration),
    [showToast]
  );
  const error = useCallback(
    (message: string, duration?: number) => showToast("error", message, duration),
    [showToast]
  );
  const info = useCallback(
    (message: string, duration?: number) => showToast("info", message, duration),
    [showToast]
  );

  // Escuchar eventos globales disparados con window.dispatchEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type?: ToastType;
        message?: string;
        duration?: number;
      }>;
      if (customEvent.detail && customEvent.detail.message) {
        showToast(
          customEvent.detail.type || "info",
          customEvent.detail.message,
          customEvent.detail.duration
        );
      }
    };
    window.addEventListener("gimnasiodb:toast", handler);
    return () => window.removeEventListener("gimnasiodb:toast", handler);
  }, [showToast]);

  const toastContainerContent = (
    <div
      id="global-toast-container"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "420px",
        width: "calc(100vw - 40px)",
      }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: "auto",
            opacity: 1,
            transform: "none",
          }}
          className={`p-4 rounded-[6px] border-2 flex items-start gap-3 shadow-2xl transition-opacity duration-200 opacity-100 ${
            toast.type === "success"
              ? "bg-[#ffffff] border-emerald-500 text-[#0a0a0a] shadow-emerald-950/20"
              : toast.type === "error"
              ? "bg-[#ffffff] border-rose-500 text-[#0a0a0a] shadow-rose-950/20"
              : "bg-[#ffffff] border-[#ff6105] text-[#0a0a0a] shadow-orange-950/20"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : toast.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-5 h-5 text-[#ff6105] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed text-[#0a0a0a]">
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-[#7a7b7b] hover:text-[#0a0a0a] cursor-pointer p-0.5 shrink-0"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast, success, error, info }}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(toastContainerContent, document.body)
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: emitGlobalToast,
      removeToast: () => {},
      success: (msg: string, d?: number) => emitGlobalToast("success", msg, d),
      error: (msg: string, d?: number) => emitGlobalToast("error", msg, d),
      info: (msg: string, d?: number) => emitGlobalToast("info", msg, d),
    };
  }
  return ctx;
}
