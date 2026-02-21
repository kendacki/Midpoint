export default function ArchitecturePage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Architecture</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
        <li><span className="font-semibold">Smart Contract:</span> `MidpointEscrow.sol` on Polygon Amoy.</li>
        <li><span className="font-semibold">Frontend:</span> Next.js App Router + Tailwind + shadcn/ui.</li>
        <li><span className="font-semibold">Wallet / Chain:</span> RainbowKit + Wagmi + Viem.</li>
        <li><span className="font-semibold">Storage:</span> IPFS uploads through backend route with signature auth.</li>
        <li><span className="font-semibold">Data model:</span> Event-driven indexing + on-chain reads for project state.</li>
      </ul>
    </article>
  );
}
