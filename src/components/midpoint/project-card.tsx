"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { Address, zeroAddress } from "viem";
import { Flame, Loader2, Upload } from "lucide-react";
import { CopyButton } from "@/components/midpoint/copy-button";
import { MidpointProject, ProjectStatus } from "@/hooks/use-midpoint";
import { normalizeTxError } from "@/lib/error-messages";
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

export function ProjectCardSkeleton() {
  return (
    <div className="glass-panel interactive-lift rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-5 w-32 animate-pulse rounded bg-zinc-200/80" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200/60" />
      </div>
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-zinc-200/60" />
      <div className="mt-2 h-4 w-36 animate-pulse rounded bg-zinc-200/50" />
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200/60" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200/50" />
      </div>
    </div>
  );
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
  onError,
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
  onError?: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h4 className="font-semibold text-zinc-900">{project.description || `Project #${project.id.toString()}`}</h4>
          <CopyButton text={project.id.toString()} label="Copy project ID" size="xs" />
        </div>
        <Badge variant={effectiveStatus === ProjectStatus.Disputed ? "destructive" : "secondary"}>{statusLabel(effectiveStatus)}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1">
          Client: {shortAddress(project.client)}
          <CopyButton text={project.client} label="Copy client address" size="xs" />
        </span>
        <span className="inline-flex items-center gap-1">
          Freelancer: {shortAddress(project.freelancer)}
          <CopyButton text={project.freelancer} label="Copy freelancer address" size="xs" />
        </span>
      </div>
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
            <Button
              size="sm"
              variant="destructive"
              disabled={isWriting || acting}
              onClick={async () => {
                setActionError(null);
                setActing(true);
                try {
                  await onApplyDecay(project.id);
                } catch (err) {
                  const msg = normalizeTxError(err);
                  setActionError(msg);
                  onError?.(msg);
                } finally {
                  setActing(false);
                }
              }}
            >
              {acting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Apply Burn"}
            </Button>
            <Input value={settlementCut} onChange={(event) => setSettlementCut(event.target.value)} placeholder="Freelancer share % (e.g. 5000 = 50%)" title="Base points: 10000 = 100%. 5000 = 50% to freelancer." />
            <Button
              size="sm"
              variant="outline"
              disabled={isWriting || acting}
              onClick={async () => {
                setActionError(null);
                setActing(true);
                try {
                  await onMutualSettlement(project.id, Number(settlementCut));
                } catch (err) {
                  const msg = normalizeTxError(err);
                  setActionError(msg);
                  onError?.(msg);
                } finally {
                  setActing(false);
                }
              }}
            >
              {acting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Settle"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {effectiveStatus === ProjectStatus.AwaitingSubmission && isFreelancer && mode === "freelancer" ? (
          <label
            className={`inline-flex cursor-pointer ${uploading ? "pointer-events-none opacity-70" : ""}`}
            aria-busy={uploading}
          >
            <input
              className="hidden"
              type="file"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setActionError(null);
                setUploading(true);
                try {
                  await onSubmitWork(project.id, file);
                } catch (err) {
                  const msg = normalizeTxError(err);
                  setActionError(msg);
                  onError?.(msg);
                } finally {
                  setUploading(false);
                  event.currentTarget.value = "";
                }
              }}
            />
            <span className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 touch-manipulation transition-transform duration-75 active:scale-[0.98]">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload + Submit
                </>
              )}
            </span>
          </label>
        ) : null}

        {effectiveStatus === ProjectStatus.UnderReview && isClient && mode === "client" ? (
          <>
            {submissionUrl ? (
              <a
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 touch-manipulation transition-transform duration-75 hover:bg-zinc-100 active:scale-[0.98]"
                href={submissionUrl}
                target="_blank"
                rel="noreferrer"
              >
                Download Document
              </a>
            ) : (
              <span className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 px-3 text-sm font-medium text-zinc-400">
                {project.hasSubmissionSignal ? "Loading document…" : "No document yet"}
              </span>
            )}
            <Button
              size="sm"
              className={submissionUrl ? "bg-emerald-600 text-white hover:bg-emerald-500" : ""}
              variant={submissionUrl ? "default" : "outline"}
              disabled={isWriting || releasing || !submissionUrl}
              onClick={async () => {
                setActionError(null);
                setReleasing(true);
                try {
                  await onApprove(project.id);
                } catch (err) {
                  const msg = normalizeTxError(err);
                  setActionError(msg);
                  onError?.(msg);
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
            <a
              href={`mailto:condoleezzatobi@gmail.com?subject=${encodeURIComponent(`Midpoint Escrow Dispute Ticket - Project #${project.id}`)}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-red-600 px-4 text-sm font-medium text-white touch-manipulation transition-transform duration-75 hover:bg-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
              aria-label="Open dispute ticket email"
            >
              Dispute
            </a>
          </>
        ) : null}

        {effectiveStatus === ProjectStatus.UnderReview && isFreelancer && mode === "freelancer" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isWriting || acting}
            onClick={async () => {
              setActionError(null);
              setActing(true);
              try {
                await onClaimTimeout(project.id);
              } catch (err) {
                const msg = normalizeTxError(err);
                setActionError(msg);
                onError?.(msg);
              } finally {
                setActing(false);
              }
            }}
          >
            {acting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Claim Timeout"}
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      ) : null}

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
