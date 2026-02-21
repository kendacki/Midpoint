export default function TroubleshootingPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Troubleshooting</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
        <li>If project lists are empty, confirm correct chain and contract address.</li>
        <li>If wallet connect fails, verify WalletConnect project id environment variable.</li>
        <li>If upload fails, confirm Pinata secrets + wallet signature headers are valid.</li>
        <li>If deploy script fails, confirm RPC URL and deployer wallet has gas balance.</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-700">
        For persistent issues, check browser console, network tab, and server logs to identify failing stage quickly.
      </p>
    </article>
  );
}
