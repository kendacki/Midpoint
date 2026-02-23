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

      <h3 className="mt-6 font-montserrat text-lg font-semibold text-zinc-900">Verify Contract on PolygonScan</h3>
      <p className="mt-2 text-sm text-zinc-700">
        After deploying, verify the contract so users can inspect the source on{" "}
        <a
          href="https://amoy.polygonscan.com"
          target="_blank"
          rel="noreferrer"
          className="text-violet-600 underline"
        >
          amoy.polygonscan.com
        </a>
        .
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        <li>Get a free API key from{" "}
          <a href="https://polygonscan.com/register" target="_blank" rel="noreferrer" className="text-violet-600 underline">
            polygonscan.com/register
          </a>
        </li>
        <li>Add <code className="rounded bg-zinc-100 px-1">POLYGONSCAN_API_KEY</code> to your <code className="rounded bg-zinc-100 px-1">.env</code></li>
        <li>Run: <code className="rounded bg-zinc-100 px-1">npm run contract:verify:amoy</code></li>
      </ol>
    </article>
  );
}
