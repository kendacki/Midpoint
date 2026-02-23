import Link from "next/link";

export default function DocumentationPage() {
  return (
    <article className="glass-panel interactive-lift reveal-up rounded-2xl p-5">
      <h2 className="font-montserrat text-2xl font-bold text-zinc-900">Overview</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-700">
        Midpoint is a decentralized escrow for freelance work. Funds are escrowed in contract, work is submitted by IPFS CID,
        and release/dispute logic runs directly from blockchain state.
      </p>
      <p className="mt-3 text-sm leading-6 text-zinc-700">
        Use the left sidebar to navigate each part of the system. Start with getting started, then move through architecture,
        smart contract behavior, frontend routes, security, and deployment.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/documentation/getting-started" className="glass-button">
          Start Reading
        </Link>
        <Link href="/documentation/deployment" className="glass-button">
          Jump to Deployment
        </Link>
      </div>
    </article>
  );
}
