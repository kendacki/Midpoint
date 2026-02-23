"use client";

import { TopNav } from "@/components/midpoint/top-nav";
import { MotionDecor } from "@/components/midpoint/motion-decor";
import { ProjectCard } from "@/components/midpoint/project-card";
import { TransactionHistory } from "@/components/midpoint/transaction-history";
import { ProjectStatus, useMidpoint } from "@/hooks/use-midpoint";

export default function FreelancerPage() {
  const midpoint = useMidpoint();
  const effectiveStatus = (project: (typeof midpoint.freelancerProjects)[number]) => {
    if (project.status !== ProjectStatus.Resolved && project.hasResolvedSignal) return ProjectStatus.Resolved;
    if (project.status === ProjectStatus.AwaitingSubmission && (project.submissionCid || project.hasSubmissionSignal)) {
      return ProjectStatus.UnderReview;
    }
    return project.status;
  };
  const pendingCount = midpoint.freelancerProjects.filter(
    (project) => effectiveStatus(project) !== ProjectStatus.Resolved
  ).length;
  const completedCount = midpoint.freelancerProjects.filter(
    (project) => effectiveStatus(project) === ProjectStatus.Resolved
  ).length;
  const pendingSubmissionCount = midpoint.freelancerProjects.filter(
    (project) => effectiveStatus(project) === ProjectStatus.AwaitingSubmission
  ).length;

  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="glass-panel interactive-lift reveal-up rounded-3xl p-6">
            <h1 className="font-montserrat text-2xl font-bold text-zinc-900 sm:text-3xl">Freelancer Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">Submit work, monitor review timers, and claim funds when eligible.</p>
            {!midpoint.isConnected ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Connect your wallet above to view your Trustless orders and submit work.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Pending</p>
                <p className="text-2xl font-semibold text-zinc-900">{pendingCount}</p>
              </div>
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Completed</p>
                <p className="text-2xl font-semibold text-zinc-900">{completedCount}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Pending Submissions</p>
                <p className="text-2xl font-semibold text-zinc-900">{pendingSubmissionCount}</p>
              </div>
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Claimed Funds</p>
                <p className="text-xl font-semibold text-zinc-900">
                  {midpoint.formatTokenAmount(midpoint.claimedPOL)} POL
                </p>
                <p className="text-sm text-zinc-600">{midpoint.formatTokenAmount(midpoint.claimedUSDC, 6)} USDC</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 reveal-up" style={{ animationDelay: "120ms" }}>
            {midpoint.freelancerProjects.length ? (
              midpoint.freelancerProjects.map((project) => (
                <ProjectCard
                  key={project.id.toString()}
                  project={project}
                  me={midpoint.address}
                  mode="freelancer"
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
              <div className="glass-panel interactive-lift rounded-2xl p-6 text-sm text-zinc-600">
                <p className="font-medium text-zinc-800">No Trustless orders yet.</p>
                <p className="mt-2">Share your wallet address with clients so they can create Trustless orders for you.</p>
                <p className="mt-2 text-xs text-zinc-500">Once a client creates an order with your address, it will appear here. Connect your wallet to get started.</p>
              </div>
            )}
          </div>
        </div>

        <div className="reveal-up" style={{ animationDelay: "180ms" }}>
          <TransactionHistory title="Freelancer Transaction History" entries={midpoint.freelancerHistory} />
        </div>
      </section>
    </main>
  );
}
