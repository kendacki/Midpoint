"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
  size = "sm",
}: {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const iconSize = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padding = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded border border-white/60 bg-white/50 text-zinc-600 transition hover:bg-white/70 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${padding} ${className}`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <Check className={`${iconSize} text-emerald-600`} aria-hidden />
      ) : (
        <Copy className={iconSize} aria-hidden />
      )}
    </button>
  );
}
