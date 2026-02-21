import { MidpointHistoryEntry } from "@/hooks/use-midpoint";

function shortHash(txHash: string) {
  return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
}

export function TransactionHistory({
  title,
  entries,
}: {
  title: string;
  entries: MidpointHistoryEntry[];
}) {
  return (
    <section className="glass-panel interactive-lift rounded-2xl p-4 sm:p-5">
      <h3 className="mb-3 font-semibold text-zinc-900">{title}</h3>
      {!entries.length ? <p className="text-sm text-zinc-600">No transaction history yet.</p> : null}
      <div className="space-y-2">
        {entries.slice(0, 20).map((entry) => (
          <div key={`${entry.txHash}-${entry.event}`} className="rounded-xl border border-white/40 bg-white/50 p-3 text-sm backdrop-blur transition hover:bg-white/65">
            <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-medium text-zinc-900">{entry.event}</span>
              <span className="text-xs text-zinc-600">Project #{entry.projectId.toString()}</span>
            </div>
            <div className="mt-1 flex flex-col items-start justify-between gap-1 text-xs text-zinc-600 sm:flex-row sm:items-center">
              <span>Block {entry.blockNumber.toString()}</span>
              <a
                className="break-all underline"
                href={`https://www.oklink.com/amoy/tx/${entry.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(entry.txHash)}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
