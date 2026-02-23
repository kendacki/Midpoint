"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopNav() {
  return (
    <header className="glass-panel reveal-up sticky top-3 z-30 mx-auto mb-6 w-full max-w-6xl rounded-2xl px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="block bg-transparent">
            <Image src="/midpoint-logo.png" alt="Midpoint logo" width={156} height={68} className="h-auto w-[100px] sm:w-[136px] bg-transparent" />
          </Link>
        </div>
        <div className="glass-connect">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
      <nav className="mt-3 flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-1 text-sm font-medium text-zinc-700 md:hidden">
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/">Home</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/client">Client</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/freelancer">Freelancer</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/documentation">Documentation</Link>
      </nav>
      <nav className="mt-2 hidden flex-wrap items-center justify-center gap-2 text-sm font-medium text-zinc-700 md:flex lg:gap-3">
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/">Home</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/client">Client</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/freelancer">Freelancer</Link>
        <Link className="rounded-lg border border-white/60 bg-white/45 px-3 py-1.5 whitespace-nowrap transition hover:scale-[1.03] hover:bg-white/65 hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2" href="/documentation">Documentation</Link>
      </nav>
    </header>
  );
}
