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
    <section className="glass-panel interactive-lift rounded-2xl p-5">
      <h3 className="mb-3 font-semibold text-zinc-900">{title}</h3>
      {!entries.length ? <p className="text-sm text-zinc-600">No transaction history yet.</p> : null}
      <div className="space-y-2">
        {entries.slice(0, 20).map((entry) => (
          <div key={`${entry.txHash}-${entry.event}`} className="rounded-xl border border-white/40 bg-white/50 p-3 text-sm backdrop-blur transition hover:bg-white/65">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-zinc-900">{entry.event}</span>
              <span className="text-xs text-zinc-600">Project #{entry.projectId.toString()}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-zinc-600">
              <span>Block {entry.blockNumber.toString()}</span>
              <a
                className="underline"
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
