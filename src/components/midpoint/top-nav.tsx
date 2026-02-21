"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopNav() {
  return (
    <header className="glass-panel reveal-up sticky top-4 z-30 mx-auto mb-6 flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <Image src="/midpoint-logo.png" alt="Midpoint logo" width={120} height={52} className="h-auto w-[92px] sm:w-[112px]" />
        <div className="hidden text-xs text-zinc-700 sm:block">On-chain escrow for builders</div>
      </div>
      <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-700 md:flex">
        <Link className="transition hover:-translate-y-0.5 hover:text-zinc-950" href="/">Home</Link>
        <Link className="transition hover:-translate-y-0.5 hover:text-zinc-950" href="/client">Client</Link>
        <Link className="transition hover:-translate-y-0.5 hover:text-zinc-950" href="/freelancer">Freelancer</Link>
        <Link className="transition hover:-translate-y-0.5 hover:text-zinc-950" href="/documentation">Documentation</Link>
      </nav>
      <ConnectButton chainStatus="icon" showBalance={false} />
    </header>
  );
}
