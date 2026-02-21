"use client";

import Link from "next/link";
import { MotionDecor } from "@/components/midpoint/motion-decor";
import { TopNav } from "@/components/midpoint/top-nav";
import { useMidpoint } from "@/hooks/use-midpoint";

export default function Home() {
  const midpoint = useMidpoint();

  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel interactive-lift reveal-up rounded-3xl p-6 sm:p-10">
          <p className="mb-3 font-montserrat text-sm uppercase tracking-[0.25em] text-violet-600">Midpoint Protocol</p>
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            Trustless Deals for <span className="text-violet-600">Clients</span> and <span className="text-sky-500">Freelancers</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-700">
            Secure payments on Polygon with a clear timeline, built-in dispute pressure, and transparent on-chain history.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link href="/client" className="glass-button">
              Client
            </Link>
            <Link href="/freelancer" className="glass-button">
              Freelancer
            </Link>
            <Link href="/documentation" className="glass-button">
              Documentation
            </Link>
          </div>
          <p className="mt-5 text-sm text-zinc-600">
            {midpoint.isConnected
              ? "Wallet connected. Choose a dashboard above to start."
              : "Connect wallet first, then choose your dashboard."}
          </p>
        </div>

        <div className="glass-panel floating-card interactive-lift rounded-3xl p-6 sm:p-8">
          <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Live Overview</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="mini-glass interactive-lift">
              <p className="text-xs uppercase text-zinc-500">Active</p>
              <p className="text-2xl font-semibold">{midpoint.activeProjects.length}</p>
            </div>
            <div className="mini-glass interactive-lift">
              <p className="text-xs uppercase text-zinc-500">Awaiting Action</p>
              <p className="text-2xl font-semibold">{midpoint.awaitingMyAction.length}</p>
            </div>
            <div className="mini-glass interactive-lift">
              <p className="text-xs uppercase text-zinc-500">Completed</p>
              <p className="text-2xl font-semibold">{midpoint.completedProjects.length}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-100/70 to-sky-100/60 p-4 text-sm text-zinc-700">
            14-day review timer, dispute burn pressure, and wallet-scoped transaction history are all built in.
          </div>
        </div>
      </section>
    </main>
  );
}
