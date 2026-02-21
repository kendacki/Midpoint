import { TopNav } from "@/components/midpoint/top-nav";

export default function DocumentationPage() {
  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <TopNav />
      <section className="mx-auto w-full max-w-6xl space-y-5">
        <div className="glass-panel rounded-3xl p-6">
          <h1 className="font-montserrat text-3xl font-bold text-zinc-900">Documentation</h1>
          <p className="mt-2 text-sm text-zinc-700">How Midpoint works for both roles.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="glass-panel rounded-2xl p-5">
            <h2 className="font-montserrat text-lg font-semibold">Client Flow</h2>
            <p className="mt-2 text-sm text-zinc-700">Create project, deposit POL/USDC, review submission, approve or dispute.</p>
          </article>
          <article className="glass-panel rounded-2xl p-5">
            <h2 className="font-montserrat text-lg font-semibold">Freelancer Flow</h2>
            <p className="mt-2 text-sm text-zinc-700">Upload work to IPFS, submit CID, wait review, claim timeout if client is inactive.</p>
          </article>
          <article className="glass-panel rounded-2xl p-5">
            <h2 className="font-montserrat text-lg font-semibold">Dispute Decay</h2>
            <p className="mt-2 text-sm text-zinc-700">When disputed, 5% can burn every 7 days until settlement resolves remaining funds.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
