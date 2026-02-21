"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const docsLinks = [
  { href: "/documentation", label: "Overview" },
  { href: "/documentation/getting-started", label: "Getting Started" },
  { href: "/documentation/architecture", label: "Architecture" },
  { href: "/documentation/smart-contract", label: "Smart Contract" },
  { href: "/documentation/frontend", label: "Frontend & UX" },
  { href: "/documentation/security", label: "Security" },
  { href: "/documentation/deployment", label: "Deployment" },
  { href: "/documentation/troubleshooting", label: "Troubleshooting" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel interactive-lift reveal-up h-fit rounded-2xl p-3 sm:p-4 lg:sticky lg:top-24">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Documentation</p>
      <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
        {docsLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-2 py-1.5 text-sm transition",
                active ? "bg-white/70 font-semibold text-zinc-900" : "text-zinc-700 hover:bg-white/60 hover:text-zinc-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
