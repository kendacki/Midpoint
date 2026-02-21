"use client";

import { useMemo, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { Address, zeroAddress } from "viem";
import { Flame, Upload } from "lucide-react";
import { MidpointProject, ProjectStatus } from "@/hooks/use-midpoint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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

export function ProjectCard({
  project,
  me,
  mode,
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
  mode: "client" | "freelancer";
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
    <article className="glass-panel interactive-lift rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-zinc-900">Project #{project.id.toString()}</h4>
        <Badge variant={project.status === ProjectStatus.Disputed ? "destructive" : "secondary"}>{statusLabel(project.status)}</Badge>
      </div>
      <p className="text-xs text-zinc-600">
        Client: {shortAddress(project.client)} · Freelancer: {shortAddress(project.freelancer)}
      </p>
      {project.description ? (
        <div className="mt-2 rounded-xl border border-violet-200/70 bg-violet-50/70 p-3 text-sm text-zinc-700">
          <span className="font-semibold text-violet-800">Project details: </span>
          {project.description}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-white/40 bg-white/50 p-3 transition hover:bg-white/65">
          <p className="text-zinc-500">Escrowed</p>
          <p className="break-all font-semibold">{formatTokenAmount(project.totalAmount, decimals)} {currencyLabel(project.token)}</p>
        </div>
        <div className="rounded-xl border border-white/40 bg-white/50 p-3 transition hover:bg-white/65">
          <p className="text-zinc-500">Remaining</p>
          <p className="break-all font-semibold">{formatTokenAmount(project.remainingAmount, decimals)} {currencyLabel(project.token)}</p>
        </div>
      </div>

      {project.status === ProjectStatus.UnderReview ? (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-blue-900">Review window</span>
            <span className="text-blue-700">{reviewRemaining}</span>
          </div>
          <Progress value={reviewProgress} />
        </div>
      ) : null}

      {project.status === ProjectStatus.AwaitingSubmission ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {mode === "freelancer"
            ? "Upload + Submit is now unlocked for freelancer. Once submitted, the 14-day client review timer starts automatically."
            : "Waiting for freelancer to upload work. The 14-day review timer starts right after submission."}
        </div>
      ) : null}

      {project.status === ProjectStatus.Disputed ? (
        <div className="burning-pulse mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-red-700">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">Dispute Decay</span>
          </div>
          <p className="text-sm text-red-700">Next burn in {burnRemaining}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button size="sm" variant="destructive" disabled={isWriting} onClick={() => onApplyDecay(project.id)}>
              Apply Burn
            </Button>
            <Input value={settlementCut} onChange={(event) => setSettlementCut(event.target.value)} placeholder="Freelancer bps" />
            <Button size="sm" variant="outline" disabled={isWriting} onClick={() => onMutualSettlement(project.id, Number(settlementCut))}>
              Settle
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {project.status === ProjectStatus.AwaitingSubmission && isFreelancer && mode === "freelancer" ? (
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
              {uploading ? "Uploading..." : "Upload + Submit"}
            </span>
          </label>
        ) : null}

        {project.status === ProjectStatus.UnderReview && isClient && mode === "client" ? (
          <>
            <Button size="sm" disabled={isWriting} onClick={() => onApprove(project.id)}>Release</Button>
            <Button size="sm" variant="destructive" disabled={isWriting} onClick={() => onDispute(project.id)}>Dispute</Button>
          </>
        ) : null}

        {project.status === ProjectStatus.UnderReview && isFreelancer && mode === "freelancer" ? (
          <Button size="sm" variant="outline" disabled={isWriting} onClick={() => onClaimTimeout(project.id)}>
            Claim Timeout
          </Button>
        ) : null}
      </div>

      {project.submissionCid ? (
        <a
          className="mt-3 inline-block text-sm text-blue-700 underline"
          href={`https://gateway.pinata.cloud/ipfs/${project.submissionCid}`}
          target="_blank"
          rel="noreferrer"
        >
          View submitted file on IPFS
        </a>
      ) : null}
    </article>
  );
}
