"use client";

import { TopNav } from "@/components/midpoint/top-nav";
import { MotionDecor } from "@/components/midpoint/motion-decor";
import { ProjectCard } from "@/components/midpoint/project-card";
import { TransactionHistory } from "@/components/midpoint/transaction-history";
import { ProjectStatus, useMidpoint } from "@/hooks/use-midpoint";

export default function FreelancerPage() {
  const midpoint = useMidpoint();
  const activeCount = midpoint.freelancerProjects.filter((project) => project.status === ProjectStatus.AwaitingSubmission).length;
  const pendingCount = midpoint.freelancerProjects.filter(
    (project) => project.status === ProjectStatus.UnderReview || project.status === ProjectStatus.Disputed
  ).length;
  const completedCount = midpoint.freelancerProjects.filter((project) => project.status === ProjectStatus.Resolved).length;

  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="glass-panel interactive-lift reveal-up rounded-3xl p-6">
            <h1 className="font-montserrat text-2xl font-bold text-zinc-900 sm:text-3xl">Freelancer Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">Submit work, monitor review timers, and claim funds when eligible.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Active</p>
                <p className="text-2xl font-semibold text-zinc-900">{activeCount}</p>
              </div>
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
                <p className="text-2xl font-semibold text-zinc-900">{midpoint.pendingSubmissions.length}</p>
              </div>
              <div className="mini-glass interactive-lift">
                <p className="text-xs uppercase text-zinc-500">Claimable Funds</p>
                <p className="text-2xl font-semibold text-zinc-900">{midpoint.claimableFunds.length}</p>
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
              <div className="glass-panel interactive-lift rounded-2xl p-4 text-sm text-zinc-600">No freelancer projects yet.</div>
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
