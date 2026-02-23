"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

export function Toast({
  toast,
  onDismiss,
  duration = 5000,
}: {
  toast: ToastItem;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : CheckCircle2;
  const bg = toast.type === "success" ? "bg-emerald-50 border-emerald-200" : toast.type === "error" ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200";
  const text = toast.type === "success" ? "text-emerald-800" : toast.type === "error" ? "text-red-800" : "text-zinc-800";
  const iconColor = toast.type === "success" ? "text-emerald-600" : toast.type === "error" ? "text-red-600" : "text-zinc-600";

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${bg} ${text}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
