export default function FrontendPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Frontend & UX</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
        <li><code>/</code> acts as branded entry page with role options.</li>
        <li><code>/client</code> contains create escrow and client-side actions.</li>
        <li><code>/freelancer</code> contains submission and timeout claim actions.</li>
        <li><code>/documentation</code> and its subroutes provide full product guide.</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-700">
        UI style uses glassmorphism panels, motion layers, role-specific dashboards, and transaction history blocks generated from on-chain logs.
      </p>
    </article>
  );
}
