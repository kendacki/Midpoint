"use client";

import { useState } from "react";
import { Address } from "viem";
import { MotionDecor } from "@/components/midpoint/motion-decor";
import { TopNav } from "@/components/midpoint/top-nav";
import { ProjectCard } from "@/components/midpoint/project-card";
import { TransactionHistory } from "@/components/midpoint/transaction-history";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMidpoint, ProjectStatus } from "@/hooks/use-midpoint";

export default function ClientPage() {
  const midpoint = useMidpoint();
  const [freelancer, setFreelancer] = useState("");
  const [description, setDescription] = useState("");
  const [nativeAmount, setNativeAmount] = useState("0.1");
  const [usdcAmount, setUsdcAmount] = useState("25");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientActiveEscrows = midpoint.clientProjects.filter((project) => project.status !== ProjectStatus.Resolved);

  async function handleCreateNative() {
    setError(null);
    setIsCreating(true);
    try {
      await midpoint.createProjectNative(freelancer as Address, nativeAmount, description);
      setFreelancer("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create POL escrow");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateUSDC() {
    setError(null);
    setIsCreating(true);
    try {
      await midpoint.createProjectUSDC(freelancer as Address, usdcAmount, description);
      setFreelancer("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create USDC escrow");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="glass-panel interactive-lift reveal-up rounded-3xl p-6">
            <h1 className="font-montserrat text-2xl font-bold text-zinc-900 sm:text-3xl">Client Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">Create escrow deals and manage submissions, disputes, and payouts.</p>
            <div className="mt-5 space-y-3">
              <Input value={freelancer} onChange={(e) => setFreelancer(e.target.value)} placeholder="Freelancer wallet address (0x...)" />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description (what this payment is for)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={nativeAmount} onChange={(e) => setNativeAmount(e.target.value)} placeholder="POL amount" />
                <Button className="glass-button !h-10 !rounded-xl" onClick={handleCreateNative} disabled={!midpoint.isConnected || isCreating || midpoint.isWriting}>
                  Create POL Escrow
                </Button>
                <Input value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="USDC amount" />
                <Button className="glass-button !h-10 !rounded-xl" onClick={handleCreateUSDC} disabled={!midpoint.isConnected || isCreating || midpoint.isWriting}>
                  Create USDC Escrow
                </Button>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </div>

          <div className="space-y-3 reveal-up" style={{ animationDelay: "120ms" }}>
            {clientActiveEscrows.length ? (
              clientActiveEscrows.map((project) => (
                <ProjectCard
                  key={project.id.toString()}
                  project={project}
                  me={midpoint.address}
                  mode="client"
                  isWriting={midpoint.isWriting}
                  formatTokenAmount={midpoint.formatTokenAmount}
                  onSubmitWork={async (projectId, file) => {
                    const cid = await midpoint.uploadToIpfs(file);
                    await midpoint.submitWork(projectId, cid);
                  }}
                  onApprove={midpoint.approveSubmission}
                  onDispute={midpoint.dispute}
                  onClaimTimeout={midpoint.claimTimeoutPayment}
                  onApplyDecay={midpoint.applyDecayBurn}
                  onMutualSettlement={midpoint.mutualSettlement}
                />
              ))
            ) : (
              <div className="glass-panel interactive-lift rounded-2xl p-4 text-sm text-zinc-600">No active client projects yet.</div>
            )}
          </div>
        </div>

        <div className="reveal-up" style={{ animationDelay: "180ms" }}>
          <TransactionHistory title="Client Transaction History" entries={midpoint.clientHistory} />
        </div>
      </section>
    </main>
  );
}
