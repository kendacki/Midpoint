export default function GettingStartedPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Getting Started</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>Install dependencies with <code>npm install --legacy-peer-deps</code>.</li>
        <li>Copy environment values into your local env file.</li>
        <li>Run <code>npm run dev</code> and connect your wallet.</li>
        <li>Open <code>/client</code> to create escrow projects.</li>
        <li>Open <code>/freelancer</code> to submit work and monitor payout status.</li>
      </ol>
      <p className="mt-4 text-sm text-zinc-700">
        Midpoint automatically scopes data to connected wallet roles by indexing on-chain events where your address is client or freelancer.
      </p>
    </article>
  );
}
