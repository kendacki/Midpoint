export default function SmartContractPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Smart Contract</h2>
      <p className="mt-3 text-sm text-zinc-700">Core states and logic:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-700">
        <li><span className="font-semibold">AwaitingSubmission</span>: escrow funded and waiting for freelancer work CID.</li>
        <li><span className="font-semibold">UnderReview</span>: 14-day review countdown is active.</li>
        <li><span className="font-semibold">Disputed</span>: burn-pressure mode (5% per 14 days when applied).</li>
        <li><span className="font-semibold">Resolved</span>: project closed and funds distributed.</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-700">
        Key methods: <code>createProjectNative</code>, <code>createProjectERC20</code>, <code>submitWork</code>,
        <code>approveSubmission</code>, <code>claimTimeoutPayment</code>, <code>dispute</code>, <code>applyDecayBurn</code>,
        <code>mutualSettlement</code>.
      </p>
    </article>
  );
}
