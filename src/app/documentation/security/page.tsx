export default function SecurityPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Security</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
        <li>Wallet signature nonce verification protects upload route.</li>
        <li>Per-IP and per-wallet rate limiting protects backend resources.</li>
        <li>Private keys and Pinata secrets remain server-side only.</li>
        <li>Role-scoped data rendering avoids leaking unrelated project activity.</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-700">
        Recommended: rotate secrets periodically and monitor API route behavior in production logs.
      </p>
    </article>
  );
}
