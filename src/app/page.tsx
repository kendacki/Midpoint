"use client";

import { useMemo, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { Address, zeroAddress } from "viem";
import { AlertTriangle, Flame, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MidpointProject, ProjectStatus, useMidpoint } from "@/hooks/use-midpoint";

const REVIEW_SECONDS = 14 * 24 * 60 * 60;
const DISPUTE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function statusLabel(status: ProjectStatus) {
  if (status === ProjectStatus.AwaitingSubmission) return "Awaiting Submission";
  if (status === ProjectStatus.UnderReview) return "Under Review";
  if (status === ProjectStatus.Disputed) return "Disputed";
  return "Resolved";
}

function currencyLabel(token: Address) {
  return token.toLowerCase() === zeroAddress ? "POL" : "USDC";
}

function DashboardCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  project,
  me,
  onSubmitWork,
  onApprove,
  onDispute,
  onClaimTimeout,
  onApplyDecay,
  onMutualSettlement,
  formatTokenAmount,
  isWriting,
}: {
  project: MidpointProject;
  me?: Address;
  onSubmitWork: (projectId: bigint, file: File) => Promise<unknown>;
  onApprove: (projectId: bigint) => Promise<unknown>;
  onDispute: (projectId: bigint) => Promise<unknown>;
  onClaimTimeout: (projectId: bigint) => Promise<unknown>;
  onApplyDecay: (projectId: bigint) => Promise<unknown>;
  onMutualSettlement: (projectId: bigint, cutBps: number) => Promise<unknown>;
  formatTokenAmount: (amount: bigint, decimals?: number) => string;
  isWriting: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [settlementCut, setSettlementCut] = useState("5000");

  const isClient = Boolean(me && project.client.toLowerCase() === me.toLowerCase());
  const isFreelancer = Boolean(me && project.freelancer.toLowerCase() === me.toLowerCase());
  const isUSDC = project.token !== zeroAddress;
  const decimals = isUSDC ? 6 : 18;

  const reviewProgress = useMemo(() => {
    if (project.status !== ProjectStatus.UnderReview || !project.reviewDeadline) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const deadline = Number(project.reviewDeadline);
    const elapsed = REVIEW_SECONDS - Math.max(0, deadline - nowSec);
    return Math.max(0, Math.min(100, (elapsed / REVIEW_SECONDS) * 100));
  }, [project.reviewDeadline, project.status]);

  const reviewRemaining = useMemo(() => {
    if (project.status !== ProjectStatus.UnderReview || !project.reviewDeadline) return "N/A";
    const ms = Number(project.reviewDeadline) * 1000 - Date.now();
    if (ms <= 0) return "Expired";
    return formatDistanceStrict(Date.now(), Date.now() + ms);
  }, [project.reviewDeadline, project.status]);

  const nextBurnAt = useMemo(() => {
    if (project.status !== ProjectStatus.Disputed) return null;
    const nextInterval = Number(project.burnedIntervals) + 1;
    return Number(project.disputeStartTime) * 1000 + nextInterval * DISPUTE_INTERVAL_MS;
  }, [project.burnedIntervals, project.disputeStartTime, project.status]);

  const burnRemaining = useMemo(() => {
    if (!nextBurnAt) return "N/A";
    const ms = nextBurnAt - Date.now();
    if (ms <= 0) return "Ready to burn";
    return formatDistanceStrict(Date.now(), Date.now() + ms);
  }, [nextBurnAt]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Project #{project.id.toString()}</CardTitle>
          <Badge variant={project.status === ProjectStatus.Disputed ? "destructive" : "secondary"}>
            {statusLabel(project.status)}
          </Badge>
        </div>
        <CardDescription>
          Client: {shortAddress(project.client)} · Freelancer: {shortAddress(project.freelancer)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-zinc-500">Escrowed</p>
            <p className="font-semibold">
              {formatTokenAmount(project.totalAmount, decimals)} {currencyLabel(project.token)}
            </p>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-zinc-500">Remaining</p>
            <p className="font-semibold">
              {formatTokenAmount(project.remainingAmount, decimals)} {currencyLabel(project.token)}
            </p>
          </div>
        </div>

        {project.status === ProjectStatus.UnderReview ? (
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-blue-900">14-day review window</span>
              <span className="text-blue-700">{reviewRemaining}</span>
            </div>
            <Progress value={reviewProgress} />
          </div>
        ) : null}

        {project.status === ProjectStatus.Disputed ? (
          <div className="burning-pulse space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-2 text-red-700">
              <Flame className="h-4 w-4" />
              <span className="text-sm font-semibold">Decaying Dispute Mode</span>
            </div>
            <p className="text-sm text-red-700">
              Next 5% burn in <span className="font-semibold">{burnRemaining}</span>
            </p>
            <p className="text-sm text-red-700">
              Preview burn now: {formatTokenAmount(project.previewBurn, decimals)} {currencyLabel(project.token)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={isWriting}
                onClick={() => onApplyDecay(project.id)}
              >
                Apply Burn
              </Button>
              <Input
                value={settlementCut}
                onChange={(event) => setSettlementCut(event.target.value)}
                placeholder="Freelancer bps (0-10000)"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={isWriting}
                onClick={() => onMutualSettlement(project.id, Number(settlementCut))}
              >
                Propose / Confirm Settlement
              </Button>
            </div>
          </div>
        ) : null}

        {project.submissionCid ? (
          <a
            className="text-sm text-blue-700 underline"
            href={`https://gateway.pinata.cloud/ipfs/${project.submissionCid}`}
            target="_blank"
            rel="noreferrer"
          >
            View submitted work on IPFS
          </a>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {project.status === ProjectStatus.AwaitingSubmission && isFreelancer ? (
            <label className="inline-flex">
              <input
                className="hidden"
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    await onSubmitWork(project.id, file);
                  } finally {
                    setUploading(false);
                    event.currentTarget.value = "";
                  }
                }}
              />
              <span className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload + Submit Work"}
              </span>
            </label>
          ) : null}

          {project.status === ProjectStatus.UnderReview && isClient ? (
            <>
              <Button size="sm" disabled={isWriting} onClick={() => onApprove(project.id)}>
                Release Payment
              </Button>
              <Button size="sm" variant="destructive" disabled={isWriting} onClick={() => onDispute(project.id)}>
                Open Dispute
              </Button>
            </>
          ) : null}

          {project.status === ProjectStatus.UnderReview && isFreelancer ? (
            <Button size="sm" variant="outline" disabled={isWriting} onClick={() => onClaimTimeout(project.id)}>
              Claim Timeout Payment
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const midpoint = useMidpoint();
  const [freelancer, setFreelancer] = useState("");
  const [nativeAmount, setNativeAmount] = useState("0.1");
  const [usdcAmount, setUsdcAmount] = useState("25");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateNative() {
    setError(null);
    setIsCreating(true);
    try {
      await midpoint.createProjectNative(freelancer as Address, nativeAmount);
      setFreelancer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create POL project");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateUSDC() {
    setError(null);
    setIsCreating(true);
    try {
      await midpoint.createProjectUSDC(freelancer as Address, usdcAmount);
      setFreelancer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create USDC project");
    } finally {
      setIsCreating(false);
    }
  }

  const hasRole = midpoint.isClientRole || midpoint.isFreelancerRole;
  const showWelcome = !midpoint.isConnected || !hasRole;
  const clientActiveEscrows = midpoint.clientProjects.filter((project) => project.status !== ProjectStatus.Resolved);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Midpoint</h1>
          <p className="text-sm text-zinc-600">On-Chain Letter of Credit for freelancers on Polygon</p>
        </div>
        {midpoint.isConnected ? (
          <Button variant="outline" onClick={() => midpoint.disconnect()}>
            {shortAddress(midpoint.address!)}
          </Button>
        ) : (
          <Button onClick={() => midpoint.connectWallet()} disabled={midpoint.isConnecting}>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>

      {!midpoint.escrowAddress ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-2 p-4 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Set NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS to start interacting.</span>
          </CardContent>
        </Card>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashboardCard title="Active Projects" value={midpoint.activeProjects.length} subtitle="Open escrows still in motion" />
        <DashboardCard
          title="Awaiting My Action"
          value={midpoint.awaitingMyAction.length}
          subtitle="Items requiring your signature"
        />
        <DashboardCard title="Completed" value={midpoint.completedProjects.length} subtitle="Resolved and closed projects" />
      </section>

      {showWelcome ? (
        <section className="pb-12">
          <Card className="border-zinc-200 bg-white">
            <CardHeader>
              <CardTitle>Welcome to Midpoint</CardTitle>
              <CardDescription>
                Connect your wallet to access your private dashboard. Midpoint only surfaces escrows where your wallet is the
                client or freelancer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600">
              <p>- Client Portal: create and monitor active escrows.</p>
              <p>- Freelancer Portal: track pending submissions and claimable funds.</p>
              <p>- No email login. Wallet address is your identity.</p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {midpoint.isClientRole ? (
        <>
          <section className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Portal</CardTitle>
                <CardDescription>Create New Project and manage your Active Escrows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={freelancer}
                  onChange={(event) => setFreelancer(event.target.value)}
                  placeholder="Freelancer address (0x...)"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input value={nativeAmount} onChange={(event) => setNativeAmount(event.target.value)} placeholder="POL amount" />
                  <Button onClick={handleCreateNative} disabled={!midpoint.isConnected || isCreating || midpoint.isWriting}>
                    Create New Project (POL)
                  </Button>
                  <div />
                  <Input value={usdcAmount} onChange={(event) => setUsdcAmount(event.target.value)} placeholder="USDC amount" />
                  <Button
                    variant="outline"
                    onClick={handleCreateUSDC}
                    disabled={!midpoint.isConnected || isCreating || midpoint.isWriting}
                  >
                    Create New Project (USDC)
                  </Button>
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4 pb-10">
            <h2 className="text-lg font-semibold text-zinc-900">Active Escrows</h2>
            {!clientActiveEscrows.length && !midpoint.isLoading ? (
              <Card>
                <CardContent className="p-6 text-sm text-zinc-500">No active escrows found for this client wallet.</CardContent>
              </Card>
            ) : null}
            {clientActiveEscrows.map((project) => (
              <ProjectCard
                key={project.id.toString()}
                project={project}
                me={midpoint.address}
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
            ))}
          </section>
        </>
      ) : null}

      {midpoint.isFreelancerRole ? (
        <section className="space-y-4 pb-12">
          <h2 className="text-lg font-semibold text-zinc-900">Freelancer Portal</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DashboardCard
              title="Pending Submissions"
              value={midpoint.pendingSubmissions.length}
              subtitle="Escrows waiting for your IPFS submission"
            />
            <DashboardCard
              title="Claimable Funds"
              value={midpoint.claimableFunds.length}
              subtitle="Escrows where timeout claim is available"
            />
          </div>
          {!midpoint.freelancerProjects.length && !midpoint.isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-500">No freelancer escrows found for this wallet.</CardContent>
            </Card>
          ) : null}
          {midpoint.freelancerProjects.map((project) => (
            <ProjectCard
              key={project.id.toString()}
              project={project}
              me={midpoint.address}
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
          ))}
        </section>
      ) : null}
    </main>
  );
}
