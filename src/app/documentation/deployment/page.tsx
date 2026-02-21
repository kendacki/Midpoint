export default function DeploymentPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Deployment</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>Push latest code to GitHub branch.</li>
        <li>Import repo into Vercel project.</li>
        <li>Set all required environment variables in Vercel settings.</li>
        <li>Deploy and verify wallet connect + role pages + upload flow.</li>
      </ol>
      <p className="mt-4 text-sm text-zinc-700">
        Ensure `NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS`, `NEXT_PUBLIC_USDC_AMOY_ADDRESS`, and WalletConnect project id are set exactly.
      </p>
    </article>
  );
}
