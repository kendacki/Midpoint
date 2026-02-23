"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatUnits, zeroAddress } from "viem";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { CopyButton } from "@/components/midpoint/copy-button";
import { Button } from "@/components/ui/button";
import type { CompletedOrderEntry } from "@/hooks/use-midpoint";

const PAGE_SIZE = 10;

function shortHash(txHash: string) {
  return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
}

function formatAmount(amount: bigint, token: `0x${string}`): string {
  const decimals = token.toLowerCase() === zeroAddress.toLowerCase() ? 18 : 6;
  const symbol = token.toLowerCase() === zeroAddress.toLowerCase() ? "POL" : "USDC";
  const value = formatUnits(amount, decimals);
  const num = parseFloat(value);
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })} ${symbol}`;
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/40 bg-white/50 p-3">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200/80" />
          <div className="mt-2 h-3 w-16 animate-pulse rounded bg-zinc-200/60" />
        </div>
      ))}
    </div>
  );
}

export function TransactionHistory({
  title,
  entries,
  isLoading,
  isError,
  onRetry,
}: {
  title: string;
  entries: CompletedOrderEntry[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleCount;

  return (
    <section className="glass-panel interactive-lift rounded-2xl p-4 sm:p-5" aria-labelledby="completed-orders-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="completed-orders-heading" className="font-semibold text-zinc-900">{title}</h3>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs touch-manipulation"
            onClick={onRetry}
            disabled={isLoading}
            aria-label="Refresh completed orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        )}
      </div>
      {isError && !entries.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-800">Failed to load completed orders.</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      ) : isLoading && !entries.length ? (
        <HistorySkeleton />
      ) : !entries.length ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-zinc-300" aria-hidden />
          <p className="text-sm text-zinc-600">No completed orders yet.</p>
        </div>
      ) : null}
      {visibleEntries.length ? (
        <div className="space-y-2">
          {visibleEntries.map((entry) => (
            <div
              key={`${entry.txHash}-${entry.projectId}`}
              className="rounded-xl border border-white/40 bg-white/50 p-3 text-sm backdrop-blur transition hover:bg-white/65"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Completed
                  </span>
                  <span className="text-xs text-zinc-600">Project #{entry.projectId.toString()}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-900">{formatAmount(entry.amount, entry.token)}</span>
                  <span className="text-xs text-zinc-600">
                    {entry.completedAt > 0 ? format(entry.completedAt * 1000, "MMM d, yyyy HH:mm") : "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
                  <a
                    className="break-all underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
                    href={`https://www.oklink.com/amoy/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View transaction ${shortHash(entry.txHash)} on explorer`}
                  >
                    {shortHash(entry.txHash)}
                  </a>
                  <CopyButton text={entry.txHash} label="Copy transaction hash" size="xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {hasMore && entries.length ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-xs"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}
