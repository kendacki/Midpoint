"use client";

import { useEffect, useState } from "react";
import { Address, isAddress, parseUnits } from "viem";
import { MotionDecor } from "@/components/midpoint/motion-decor";
import { TopNav } from "@/components/midpoint/top-nav";
import { useToast } from "@/lib/toast-context";
import { ProjectCard, ProjectCardSkeleton } from "@/components/midpoint/project-card";
import { TransactionHistory } from "@/components/midpoint/transaction-history";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useMidpoint, ProjectStatus } from "@/hooks/use-midpoint";
import { isUserRejection, normalizeTxError } from "@/lib/error-messages";

type TxStatus = "idle" | "approving" | "creating" | "success" | "error";

export default function ClientPage() {
  const midpoint = useMidpoint();
  const { toast } = useToast();
  const { isConnected, connector } = useAccount();
  const [freelancer, setFreelancer] = useState("");
  const [description, setDescription] = useState("");
  const [nativeAmount, setNativeAmount] = useState("0.1");
  const [usdcAmount, setUsdcAmount] = useState("25");
  const [polTxStatus, setPolTxStatus] = useState<TxStatus>("idle");
  const [usdcTxStatus, setUsdcTxStatus] = useState<TxStatus>("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveStatus = (project: (typeof midpoint.clientProjects)[number]) => {
    if (project.status !== ProjectStatus.Resolved && project.hasResolvedSignal) return ProjectStatus.Resolved;
    if (project.status === ProjectStatus.AwaitingSubmission && (project.submissionCid || project.hasSubmissionSignal)) {
      return ProjectStatus.UnderReview;
    }
    return project.status;
  };
  const clientActiveEscrows = midpoint.clientProjects.filter(
    (project) => effectiveStatus(project) !== ProjectStatus.Resolved
  );
  const pendingCount = midpoint.clientProjects.filter(
    (project) => effectiveStatus(project) !== ProjectStatus.Resolved
  ).length;
  const completedCount = midpoint.clientProjects.filter(
    (project) => effectiveStatus(project) === ProjectStatus.Resolved
  ).length;

  useEffect(() => {
    if (polTxStatus !== "success") return;
    const t = setTimeout(() => setPolTxStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [polTxStatus]);

  useEffect(() => {
    if (usdcTxStatus !== "success") return;
    const t = setTimeout(() => setUsdcTxStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [usdcTxStatus]);

  function getPolButtonText(): string {
    switch (polTxStatus) {
      case "creating":
        return "Creating Escrow (1/1)...";
      case "success":
        return "Success!";
      case "error":
        return "Try Again";
      default:
        return "Create POL Escrow";
    }
  }

  function getUsdcButtonText(): string {
    switch (usdcTxStatus) {
      case "approving":
        return "Approving USDC (1/2)...";
      case "creating":
        return "Creating Escrow (2/2)...";
      case "success":
        return "Success!";
      case "error":
        return "Try Again";
      default:
        return "Create USDC Escrow";
    }
  }

  async function handleCreateNative(e?: React.MouseEvent) {
    e?.preventDefault?.();
    setError(null);
    setSuccessMessage(null);
    if (!isAddress(freelancer.trim())) {
      setError("Invalid freelancer wallet address.");
      return;
    }
    setPolTxStatus("creating");
    try {
      if (!isConnected || !connector) {
        console.error("Wagmi Connector not hydrated");
        throw new Error("Wallet connection is syncing. Please wait a moment or reconnect your wallet.");
      }
      await midpoint.createProjectNative(freelancer.trim() as Address, nativeAmount, description, {
        onPhase: () => setPolTxStatus("creating"),
      });
      setFreelancer("");
      setDescription("");
      setPolTxStatus("success");
      setSuccessMessage("POL escrow created. Share your wallet address with the freelancer so they can see the project.");
      toast("POL escrow created successfully", "success");
      setTimeout(() => setSuccessMessage(null), 6000);
      void midpoint.refresh();
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      console.error("TX Error (POL):", e.shortMessage ?? e.message ?? err);
      if (err && typeof err === "object" && "message" in err && String((err as { message?: unknown }).message).includes("429")) {
        console.error("RPC rate limit (429). Use private Alchemy/QuickNode RPC - see NEXT_PUBLIC_AMOY_RPC_URL.");
      }
      if (isUserRejection(err)) {
        setPolTxStatus("idle");
        toast("Transaction rejected by user", "error");
        return;
      }
      try {
        const msg = normalizeTxError(err);
        setError(msg);
        setPolTxStatus("error");
        toast(msg, "error");
      } catch (parseErr) {
        console.error("Error parsing TX error:", parseErr);
        setPolTxStatus("error");
      }
    } finally {
      setTimeout(() => {
        if (midpoint.resetWriteContract) midpoint.resetWriteContract();
        setPolTxStatus((prev) => (prev === "creating" ? "idle" : prev));
      }, 500);
    }
  }

  async function handleCreateUSDC(e?: React.MouseEvent) {
    e?.preventDefault?.();
    setError(null);
    setSuccessMessage(null);
    if (!isAddress(freelancer.trim())) {
      setError("Invalid freelancer wallet address.");
      return;
    }
    try {
      if (!isConnected || !connector) {
        console.error("Wagmi Connector not hydrated");
        throw new Error("Wallet connection is syncing. Please wait a moment or reconnect your wallet.");
      }
      // 1. Pre-flight: validate env vars (NEXT_PUBLIC_USDC_AMOY_ADDRESS, NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS in .env.local)
      const usdcAddr = midpoint.usdcAddress;
      const escrowAddr = midpoint.escrowAddress;
      if (!usdcAddr || !String(usdcAddr).startsWith("0x")) {
        throw new Error("CRITICAL: USDC address is missing or invalid in environment variables. Add NEXT_PUBLIC_USDC_AMOY_ADDRESS to .env.local");
      }
      if (!escrowAddr || !String(escrowAddr).startsWith("0x")) {
        throw new Error("CRITICAL: Escrow contract address is missing or invalid. Add NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS to .env.local");
      }
      // 2. Validate amount input
      if (!usdcAmount || isNaN(Number(usdcAmount)) || Number(usdcAmount) <= 0) {
        throw new Error("CRITICAL: Invalid amount entered.");
      }
      // 3. Safe parse (parseUnits crashes on bad data)
      try {
        parseUnits(usdcAmount, 6);
      } catch (parseError) {
        throw new Error(`CRITICAL: Failed to parse USDC amount. Input: ${usdcAmount}`);
      }

      setUsdcTxStatus("approving");
      await midpoint.createProjectUSDC(freelancer.trim() as Address, usdcAmount, description, {
        onPhase: (phase) => {
          setUsdcTxStatus(phase === "awaitingApproval" ? "approving" : "creating");
        },
      });
      setFreelancer("");
      setDescription("");
      setUsdcTxStatus("success");
      setSuccessMessage("USDC escrow created. Share your wallet address with the freelancer so they can see the project.");
      toast("USDC escrow created successfully", "success");
      setTimeout(() => setSuccessMessage(null), 6000);
      void midpoint.refresh();
    } catch (err: unknown) {
      console.error("FULL TX ERROR:", err);
      let errorMessage = "Transaction failed.";
      const e = err as { walk?: (fn: (x: unknown) => unknown) => unknown; shortMessage?: string; message?: string; data?: { message?: string }; reason?: string };
      if (e?.walk && typeof e.walk === "function") {
        const revertError = e.walk((x: unknown) => ((x as { name?: string }).name === "ContractFunctionRevertedError" ? x : undefined)) as
          | { data?: { message?: string }; reason?: string; shortMessage?: string; message?: string }
          | undefined;
        if (revertError) {
          const r = revertError;
          errorMessage = `Contract Reverted: ${r.data?.message ?? r.reason ?? r.shortMessage ?? r.message ?? "Unknown"}`;
          console.error("SOLIDITY REVERT REASON:", revertError);
        } else {
          errorMessage = e.shortMessage ?? e.message ?? String(err);
        }
      } else {
        errorMessage = e.shortMessage ?? e.message ?? String(err);
      }
      if (err && typeof err === "object" && "message" in err && String((err as { message?: unknown }).message).includes("429")) {
        console.error("RPC rate limit (429). Use private Alchemy/QuickNode RPC - see NEXT_PUBLIC_AMOY_RPC_URL.");
      }
      if (isUserRejection(err)) {
        setUsdcTxStatus("idle");
        toast("Transaction rejected by user", "error");
        return;
      }
      setError(errorMessage);
      setUsdcTxStatus("error");
      toast(errorMessage, "error");
    } finally {
      setTimeout(() => {
        if (midpoint.resetWriteContract) midpoint.resetWriteContract();
        setUsdcTxStatus((prev) => (prev === "approving" || prev === "creating" ? "idle" : prev));
      }, 500);
    }
  }

  return (
    <main id="main-content" className="midpoint-bg min-h-screen px-4 py-4 sm:px-6" tabIndex={-1}>
      <MotionDecor />
      <TopNav />
      <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="glass-panel interactive-lift reveal-up rounded-3xl p-6">
            <h1 className="font-montserrat text-2xl font-bold text-zinc-900 sm:text-3xl">Client Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">Create escrow deals and manage submissions, disputes, and payouts.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="mini-glass">
                <p className="text-xs uppercase text-zinc-500">Pending</p>
                <p className="text-2xl font-semibold text-zinc-900">{pendingCount}</p>
              </div>
              <div className="mini-glass">
                <p className="text-xs uppercase text-zinc-500">Completed</p>
                <p className="text-2xl font-semibold text-zinc-900">{completedCount}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {!midpoint.isConnected ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Connect your wallet above to create escrow.
                </p>
              ) : null}
              <div>
                <Input value={freelancer} onChange={(e) => setFreelancer(e.target.value)} placeholder="Freelancer wallet address (0x...)" className={freelancer.trim() && !isAddress(freelancer.trim()) ? "border-red-300" : ""} />
                {freelancer.trim() && !isAddress(freelancer.trim()) ? (
                  <p className="mt-1 text-xs text-red-600">Enter a valid Polygon wallet address (0x...).</p>
                ) : null}
              </div>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description (what this payment is for)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={nativeAmount} onChange={(e) => setNativeAmount(e.target.value)} placeholder="POL amount" />
                <Button
                  type="button"
                  className={`!h-10 !rounded-xl ${
                    polTxStatus === "success" || polTxStatus === "creating"
                      ? "border border-emerald-300 bg-emerald-500/90 text-white"
                      : polTxStatus === "error"
                        ? "border border-amber-300 bg-amber-500/90 text-white"
                        : "glass-button"
                  }`}
                  onClick={handleCreateNative}
                  disabled={!isConnected || !connector || (polTxStatus !== "idle" && polTxStatus !== "error") || !isAddress(freelancer.trim())}
                >
                  {getPolButtonText()}
                </Button>
                <Input value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="USDC amount" />
                <Button
                  type="button"
                  className={`!h-10 !rounded-xl ${
                    usdcTxStatus === "success" || usdcTxStatus === "approving" || usdcTxStatus === "creating"
                      ? "border border-emerald-300 bg-emerald-500/90 text-white"
                      : usdcTxStatus === "error"
                        ? "border border-amber-300 bg-amber-500/90 text-white"
                        : "glass-button"
                  }`}
                  onClick={handleCreateUSDC}
                  disabled={!isConnected || !connector || (usdcTxStatus !== "idle" && usdcTxStatus !== "error") || !isAddress(freelancer.trim())}
                >
                  {getUsdcButtonText()}
                </Button>
              </div>
              {successMessage ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMessage}</p>
              ) : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </div>

          <div className="space-y-3 reveal-up" style={{ animationDelay: "120ms" }}>
            {midpoint.isLoading && !clientActiveEscrows.length ? (
              <>
                <ProjectCardSkeleton />
                <ProjectCardSkeleton />
                <ProjectCardSkeleton />
              </>
            ) : clientActiveEscrows.length ? (
              clientActiveEscrows.map((project) => (
                <ProjectCard
                  key={project.id.toString()}
                  project={project}
                  me={midpoint.address}
                  mode="client"
                  isWriting={midpoint.isWriting}
                  formatTokenAmount={midpoint.formatTokenAmount}
                  onError={(msg) => toast(msg, "error")}
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
              <div className="glass-panel interactive-lift flex flex-col items-center rounded-2xl p-8 text-center text-sm text-zinc-600">
                <div className="rounded-full bg-violet-100 p-4">
                  <svg className="h-10 w-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="mt-4 font-medium text-zinc-800">No active client projects yet.</p>
                <p className="mt-2">Create your first escrow above. Enter the freelancer&apos;s wallet address, a description, and the amount (POL or USDC).</p>
                <p className="mt-2 text-xs text-zinc-500">Share your wallet address with the freelancer so they can connect and see projects you create.</p>
              </div>
            )}
          </div>
        </div>

        <div className="reveal-up" style={{ animationDelay: "180ms" }}>
          <TransactionHistory
            title="Client Completed Orders"
            entries={midpoint.clientCompletedOrders}
            isLoading={midpoint.isLoading}
            isError={midpoint.isCompletedOrdersError}
            onRetry={midpoint.refetchCompletedOrders}
          />
        </div>
      </section>
    </main>
  );
}
