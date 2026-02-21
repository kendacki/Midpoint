import { TopNav } from "@/components/midpoint/top-nav";
import { MotionDecor } from "@/components/midpoint/motion-decor";

export default function DocumentationPage() {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "quick-start", label: "Quick Start" },
    { id: "architecture", label: "Architecture" },
    { id: "contract-lifecycle", label: "Contract Lifecycle" },
    { id: "contract-functions", label: "Contract Functions" },
    { id: "frontend-routes", label: "Frontend Routes" },
    { id: "environment", label: "Environment Variables" },
    { id: "security", label: "Security Notes" },
    { id: "deploy", label: "Deploy To Vercel" },
    { id: "troubleshooting", label: "Troubleshooting" },
  ];

  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-5 glass-panel interactive-lift reveal-up rounded-3xl p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-violet-600">GitBook Style Docs</p>
          <h1 className="mt-2 font-montserrat text-3xl font-bold text-zinc-900 sm:text-4xl">Midpoint Documentation</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-700 sm:text-base">
            Complete guide for using, deploying, and maintaining Midpoint: the on-chain letter of credit for client and freelancer payments on Polygon.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="glass-panel interactive-lift reveal-up h-fit rounded-2xl p-4 lg:sticky lg:top-24" style={{ animationDelay: "100ms" }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">On This Page</p>
            <nav className="space-y-1">
              {sections.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1 text-sm text-zinc-700 transition hover:bg-white/60 hover:text-zinc-900"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-4 reveal-up" style={{ animationDelay: "170ms" }}>
            <article id="overview" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Overview</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Midpoint is a decentralized escrow protocol where wallet addresses are identity. Client funds are locked in contract escrow. Freelancer submits work via IPFS CID. Client either approves or disputes. If client is inactive after review deadline, freelancer can claim timeout payment.
              </p>
            </article>

            <article id="quick-start" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Quick Start</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
                <li>Connect wallet using the top-right connect button.</li>
                <li>Open <span className="font-semibold">Client</span> page to create escrow with POL or USDC.</li>
                <li>Open <span className="font-semibold">Freelancer</span> page to upload work and submit CID.</li>
                <li>Track status transitions and transaction history in each role dashboard.</li>
              </ol>
            </article>

            <article id="architecture" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Architecture</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li><span className="font-semibold">Contract:</span> Solidity escrow on Polygon Amoy.</li>
                <li><span className="font-semibold">Frontend:</span> Next.js App Router + Tailwind + shadcn/ui.</li>
                <li><span className="font-semibold">Web3:</span> Wagmi + Viem + RainbowKit.</li>
                <li><span className="font-semibold">Files:</span> IPFS uploads through secured backend API route.</li>
              </ul>
            </article>

            <article id="contract-lifecycle" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Contract Lifecycle</h2>
              <div className="mt-2 text-sm text-zinc-700">
                <p><span className="font-semibold">1. AwaitingSubmission:</span> project funded and waiting for freelancer upload.</p>
                <p><span className="font-semibold">2. UnderReview:</span> submission added; 14-day review deadline starts.</p>
                <p><span className="font-semibold">3. Disputed:</span> client disputes; burn pressure becomes active.</p>
                <p><span className="font-semibold">4. Resolved:</span> payout and close via approval, timeout claim, or settlement.</p>
              </div>
            </article>

            <article id="contract-functions" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Contract Functions</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li><code>createProjectNative</code> / <code>createProjectERC20</code></li>
                <li><code>submitWork(projectId, ipfsCid)</code></li>
                <li><code>approveSubmission(projectId)</code></li>
                <li><code>claimTimeoutPayment(projectId)</code></li>
                <li><code>dispute(projectId)</code> + <code>applyDecayBurn(projectId)</code></li>
                <li><code>mutualSettlement(projectId, freelancerCutBps)</code></li>
              </ul>
            </article>

            <article id="frontend-routes" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Frontend Routes</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li><code>/</code> main landing page with role cards.</li>
                <li><code>/client</code> client-only operational dashboard.</li>
                <li><code>/freelancer</code> freelancer-only operational dashboard.</li>
                <li><code>/documentation</code> this docs portal.</li>
              </ul>
            </article>

            <article id="environment" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Environment Variables</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li><code>NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS</code></li>
                <li><code>NEXT_PUBLIC_USDC_AMOY_ADDRESS</code></li>
                <li><code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code></li>
                <li><code>AMOY_RPC_URL</code></li>
                <li><code>DEPLOYER_PRIVATE_KEY</code></li>
                <li><code>PINATA_API_KEY</code> and <code>PINATA_API_SECRET</code> (server-side only)</li>
              </ul>
            </article>

            <article id="security" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Security Notes</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>IPFS upload API verifies signed nonce per wallet.</li>
                <li>Rate limits applied per IP and per wallet.</li>
                <li>Only wallet-scoped project/event data is rendered for privacy.</li>
                <li>No private keys are exposed in frontend code.</li>
              </ul>
            </article>

            <article id="deploy" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Deploy To Vercel</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
                <li>Import repository into Vercel.</li>
                <li>Add all required environment variables in Project Settings.</li>
                <li>Trigger deploy on <code>master</code>.</li>
                <li>Validate wallet connect, role routes, and IPFS uploads post-deploy.</li>
              </ol>
            </article>

            <article id="troubleshooting" className="glass-panel interactive-lift rounded-2xl p-5">
              <h2 className="font-montserrat text-xl font-bold text-zinc-900">Troubleshooting</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>If no projects appear, confirm contract address and chain in wallet.</li>
                <li>If upload fails, check Pinata server env vars and request signature flow.</li>
                <li>If deploy fails, verify RPC URL, funded deployer wallet, and private key formatting.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
