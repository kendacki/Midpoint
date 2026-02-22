"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { Address, zeroAddress } from "viem";
import { Flame, Loader2, Upload } from "lucide-react";
import { MidpointProject, ProjectStatus } from "@/hooks/use-midpoint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const REVIEW_SECONDS = 14 * 24 * 60 * 60;
const DISPUTE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const LIFECYCLE_SECONDS = 14 * 24 * 60 * 60;
const REVIEW_WINDOW_SECONDS = 14 * 24 * 60 * 60;

function readLocalAnchor(projectId: bigint) {
  if (typeof window === "undefined") return 0;
  try {
    const key = `midpoint-timer-anchor:${projectId.toString()}`;
    const raw = window.localStorage.getItem(key);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function writeLocalAnchor(projectId: bigint, anchorSec: number) {
  if (typeof window === "undefined" || !anchorSec) return;
  try {
    const key = `midpoint-timer-anchor:${projectId.toString()}`;
    window.localStorage.setItem(key, String(anchorSec));
  } catch {
    // Ignore local storage errors.
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function statusLabel(status: ProjectStatus) {
  if (status === ProjectStatus.AwaitingSubmission) return "Awaiting Submission";
  if (status === ProjectStatus.UnderReview) return "Submitted";
  if (status === ProjectStatus.Disputed) return "Disputed";
  return "Completed";
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
  const [releasing, setReleasing] = useState(false);
  const [settlementCut, setSettlementCut] = useState("5000");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [legacyAnchorSec, setLegacyAnchorSec] = useState(() => readLocalAnchor(project.id));
  const effectiveStatus =
    project.status !== ProjectStatus.Resolved && project.hasResolvedSignal
      ? ProjectStatus.Resolved
      : project.status === ProjectStatus.AwaitingSubmission && (project.submissionCid || project.hasSubmissionSignal)
        ? ProjectStatus.UnderReview
        : project.status;

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (legacyAnchorSec) return;
    const fallbackAnchor =
      project.createdAt > 0
        ? project.createdAt
        : Number(project.disputeStartTime) > 0
          ? Number(project.disputeStartTime)
          : Number(project.reviewDeadline) > REVIEW_WINDOW_SECONDS
            ? Number(project.reviewDeadline) - REVIEW_WINDOW_SECONDS
            : Math.floor(Date.now() / 1000);
    setLegacyAnchorSec(fallbackAnchor);
    writeLocalAnchor(project.id, fallbackAnchor);
  }, [legacyAnchorSec, project.createdAt, project.disputeStartTime, project.id, project.reviewDeadline]);

  const isClient = Boolean(me && project.client.toLowerCase() === me.toLowerCase());
  const isFreelancer = Boolean(me && project.freelancer.toLowerCase() === me.toLowerCase());
  const isUSDC = project.token !== zeroAddress;
  const decimals = isUSDC ? 6 : 18;
  const submissionUrl = project.submissionCid ? `https://gateway.pinata.cloud/ipfs/${project.submissionCid}` : null;

  const reviewProgress = useMemo(() => {
    if (effectiveStatus !== ProjectStatus.UnderReview || !project.reviewDeadline) return 0;
    const nowSec = Math.floor(nowMs / 1000);
    const deadline = Number(project.reviewDeadline);
    const elapsed = REVIEW_SECONDS - Math.max(0, deadline - nowSec);
    return Math.max(0, Math.min(100, (elapsed / REVIEW_SECONDS) * 100));
  }, [project.reviewDeadline, effectiveStatus, nowMs]);

  const reviewRemaining = useMemo(() => {
    if (effectiveStatus !== ProjectStatus.UnderReview || !project.reviewDeadline) return "N/A";
    const ms = Number(project.reviewDeadline) * 1000 - nowMs;
    if (ms <= 0) return "Expired";
    return formatDistanceStrict(nowMs, nowMs + ms);
  }, [project.reviewDeadline, effectiveStatus, nowMs]);

  const nextBurnAt = useMemo(() => {
    if (effectiveStatus !== ProjectStatus.Disputed) return null;
    const nextInterval = Number(project.burnedIntervals) + 1;
    return Number(project.disputeStartTime) * 1000 + nextInterval * DISPUTE_INTERVAL_MS;
  }, [project.burnedIntervals, project.disputeStartTime, effectiveStatus]);

  const burnRemaining = useMemo(() => {
    if (!nextBurnAt) return "N/A";
    const ms = nextBurnAt - nowMs;
    if (ms <= 0) return "Ready to burn";
    return formatDistanceStrict(nowMs, nowMs + ms);
  }, [nextBurnAt, nowMs]);

  const cycleAnchorSec = useMemo(() => {
    if (project.disputeStartTime > 0n) return Number(project.disputeStartTime);
    if (project.createdAt > 0) return project.createdAt;
    if (project.reviewDeadline > BigInt(REVIEW_WINDOW_SECONDS)) {
      return Number(project.reviewDeadline) - REVIEW_WINDOW_SECONDS;
    }
    return legacyAnchorSec;
  }, [legacyAnchorSec, project.createdAt, project.disputeStartTime, project.reviewDeadline]);

  const lifecycleProgress = useMemo(() => {
    if (!cycleAnchorSec || effectiveStatus === ProjectStatus.Resolved) return 0;
    const nowSec = Math.floor(nowMs / 1000);
    const elapsed = Math.max(0, nowSec - cycleAnchorSec);
    const cycleElapsed = elapsed % LIFECYCLE_SECONDS;
    return Math.max(0, Math.min(100, (cycleElapsed / LIFECYCLE_SECONDS) * 100));
  }, [cycleAnchorSec, effectiveStatus, nowMs]);

  const lifecycleRemaining = useMemo(() => {
    if (!cycleAnchorSec || effectiveStatus === ProjectStatus.Resolved) return "Completed";
    const nowSec = Math.floor(nowMs / 1000);
    const elapsed = Math.max(0, nowSec - cycleAnchorSec);
    const cycleElapsed = elapsed % LIFECYCLE_SECONDS;
    const remainingSec = Math.max(0, LIFECYCLE_SECONDS - cycleElapsed);
    if (remainingSec <= 0) return "Cycle elapsed";
    return formatDistanceStrict(nowMs, nowMs + remainingSec * 1000);
  }, [cycleAnchorSec, effectiveStatus, nowMs]);

  return (
    <article className="glass-panel interactive-lift rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-zinc-900">{project.description || `Project #${project.id.toString()}`}</h4>
        <Badge variant={effectiveStatus === ProjectStatus.Disputed ? "destructive" : "secondary"}>{statusLabel(effectiveStatus)}</Badge>
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

      {effectiveStatus !== ProjectStatus.Resolved && cycleAnchorSec > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-emerald-900">14-day burn timer</span>
            <span className="text-emerald-700">{lifecycleRemaining}</span>
          </div>
          <Progress value={lifecycleProgress} />
        </div>
      ) : null}

      {effectiveStatus === ProjectStatus.UnderReview ? (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-blue-900">Review window</span>
            <span className="text-blue-700">{reviewRemaining}</span>
          </div>
          <Progress value={reviewProgress} />
        </div>
      ) : null}

      {effectiveStatus === ProjectStatus.AwaitingSubmission ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {mode === "freelancer"
            ? "Upload + Submit is now unlocked for freelancer. Once submitted, the 14-day client review timer starts automatically."
            : "Waiting for freelancer to upload work. The 14-day review timer starts right after submission."}
        </div>
      ) : null}

      {effectiveStatus === ProjectStatus.Disputed ? (
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
        {effectiveStatus === ProjectStatus.AwaitingSubmission && isFreelancer && mode === "freelancer" ? (
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

        {effectiveStatus === ProjectStatus.UnderReview && isClient && mode === "client" && Boolean(submissionUrl) ? (
          <>
            <a
              className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
                submissionUrl
                  ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                  : "border border-zinc-200 bg-zinc-100 text-zinc-400 pointer-events-none"
              }`}
              href={submissionUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              Download Document
            </a>
            <Button
              size="sm"
              className={submissionUrl ? "bg-emerald-600 text-white hover:bg-emerald-500" : ""}
              variant={submissionUrl ? "default" : "outline"}
              disabled={isWriting || releasing || !submissionUrl}
              onClick={async () => {
                setReleasing(true);
                try {
                  await onApprove(project.id);
                } finally {
                  setReleasing(false);
                }
              }}
            >
              {releasing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Release Tokens"
              )}
            </Button>
            <Button size="sm" variant="destructive" disabled={isWriting} onClick={() => onDispute(project.id)}>Dispute</Button>
          </>
        ) : null}

        {effectiveStatus === ProjectStatus.UnderReview && isFreelancer && mode === "freelancer" ? (
          <Button size="sm" variant="outline" disabled={isWriting} onClick={() => onClaimTimeout(project.id)}>
            Claim Timeout
          </Button>
        ) : null}
      </div>

      {submissionUrl ? (
        <a
          className="mt-3 inline-block text-sm text-blue-700 underline"
          href={submissionUrl}
          target="_blank"
          rel="noreferrer"
        >
          View submitted file on IPFS
        </a>
      ) : null}
    </article>
  );
}
