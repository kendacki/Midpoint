"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContracts,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { Address, formatUnits, parseAbiItem, parseEther, parseUnits } from "viem";
import { midpointEscrowAbi } from "@/lib/abis/midpointEscrow";

export enum ProjectStatus {
  AwaitingSubmission = 0,
  UnderReview = 1,
  Disputed = 2,
  Resolved = 3,
}

type RawProject = readonly [Address, Address, Address, bigint, bigint, bigint, bigint, number, number, boolean];

export type MidpointProject = {
  id: bigint;
  client: Address;
  freelancer: Address;
  token: Address;
  totalAmount: bigint;
  remainingAmount: bigint;
  reviewDeadline: bigint;
  disputeStartTime: bigint;
  burnedIntervals: number;
  status: ProjectStatus;
  exists: boolean;
  submissionCid: string;
  previewBurn: bigint;
};

export type MidpointHistoryEntry = {
  projectId: bigint;
  event: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

const escrowAddress = process.env.NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS as Address | undefined;
const usdcAddress = process.env.NEXT_PUBLIC_USDC_AMOY_ADDRESS as Address | undefined;
const projectCreatedEvent = parseAbiItem(
  "event ProjectCreated(uint256 indexed projectId,address indexed client,address indexed freelancer,address token,uint256 amount)"
);
const workSubmittedEvent = parseAbiItem("event WorkSubmitted(uint256 indexed projectId,string ipfsCid,uint256 reviewDeadline)");
const projectDisputedEvent = parseAbiItem("event ProjectDisputed(uint256 indexed projectId,uint256 disputeStartTime)");
const disputeDecayEvent = parseAbiItem(
  "event DisputeDecayApplied(uint256 indexed projectId,uint256 burnedAmount,uint32 totalIntervalsBurned)"
);
const settlementProposedEvent = parseAbiItem(
  "event SettlementProposed(uint256 indexed projectId,address indexed proposer,uint256 freelancerCutBps)"
);
const projectResolvedEvent = parseAbiItem(
  "event ProjectResolved(uint256 indexed projectId,uint256 freelancerAmount,uint256 clientAmount,uint256 burnedAmount)"
);
const timeoutClaimedEvent = parseAbiItem("event TimeoutClaimed(uint256 indexed projectId,uint256 amount)");
const reviewApprovedEvent = parseAbiItem("event ReviewApproved(uint256 indexed projectId,uint256 amount)");

const historyEventDefs = [
  { label: "Project Created", event: projectCreatedEvent },
  { label: "Work Submitted", event: workSubmittedEvent },
  { label: "Project Disputed", event: projectDisputedEvent },
  { label: "Dispute Burn Applied", event: disputeDecayEvent },
  { label: "Settlement Proposed", event: settlementProposedEvent },
  { label: "Project Resolved", event: projectResolvedEvent },
  { label: "Timeout Claimed", event: timeoutClaimedEvent },
  { label: "Review Approved", event: reviewApprovedEvent },
] as const;

export function useMidpoint() {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const { data: scopedProjectIds = [], isLoading: isLoadingScopedProjects } = useQuery({
    queryKey: ["midpoint-scoped-project-ids", escrowAddress, address],
    enabled: Boolean(escrowAddress && address && publicClient),
    queryFn: async () => {
      if (!escrowAddress || !address || !publicClient) return [];

      const [asClientLogs, asFreelancerLogs] = await Promise.all([
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEvent,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEvent,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }),
      ]);

      const ids = new Set<bigint>();
      for (const log of [...asClientLogs, ...asFreelancerLogs]) {
        if (log.args.projectId) ids.add(log.args.projectId);
      }

      return Array.from(ids).sort((a, b) => Number(b - a));
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const ids = scopedProjectIds;

  const projectContracts = useMemo(
    () =>
      ids.flatMap((id) => [
        {
          abi: midpointEscrowAbi,
          address: escrowAddress as Address,
          functionName: "projects" as const,
          args: [id],
        },
        {
          abi: midpointEscrowAbi,
          address: escrowAddress as Address,
          functionName: "submissionCids" as const,
          args: [id],
        },
        {
          abi: midpointEscrowAbi,
          address: escrowAddress as Address,
          functionName: "previewDecayBurn" as const,
          args: [id],
        },
      ]),
    [ids]
  );

  const { data: contractData, isLoading: isLoadingProjects } = useReadContracts({
    contracts: projectContracts,
    allowFailure: true,
    query: {
      enabled: Boolean(escrowAddress) && ids.length > 0,
      refetchInterval: 10_000,
    },
  });

  const projects = useMemo<MidpointProject[]>(() => {
    if (!contractData || !ids.length) return [];

    return ids
      .map((id, index) => {
        const baseIndex = index * 3;
        const projectResult = contractData[baseIndex];
        const cidResult = contractData[baseIndex + 1];
        const burnResult = contractData[baseIndex + 2];

        if (projectResult.status !== "success" || !projectResult.result) return null;
        const raw = projectResult.result as RawProject;

        return {
          id,
          client: raw[0],
          freelancer: raw[1],
          token: raw[2],
          totalAmount: raw[3],
          remainingAmount: raw[4],
          reviewDeadline: raw[5],
          disputeStartTime: raw[6],
          burnedIntervals: Number(raw[7]),
          status: Number(raw[8]) as ProjectStatus,
          exists: raw[9],
          submissionCid: cidResult?.status === "success" ? (cidResult.result as string) : "",
          previewBurn: burnResult?.status === "success" ? (burnResult.result as bigint) : 0n,
        } satisfies MidpointProject;
      })
      .filter((project): project is MidpointProject => Boolean(project && project.exists))
      .sort((a, b) => Number(b.id - a.id));
  }, [contractData, ids]);

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["midpoint-history", escrowAddress, ids.map((id) => id.toString()).join(",")],
    enabled: Boolean(escrowAddress && publicClient && ids.length),
    queryFn: async () => {
      if (!escrowAddress || !publicClient || !ids.length) return [];

      const calls: Promise<MidpointHistoryEntry[]>[] = [];
      for (const id of ids) {
        for (const def of historyEventDefs) {
          const call = publicClient
            .getLogs({
              address: escrowAddress,
              event: def.event,
              args: { projectId: id },
              fromBlock: 0n,
              toBlock: "latest",
            })
            .then((logs) =>
              logs.map(
                (log) =>
                  ({
                    projectId: id,
                    event: def.label,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                  }) satisfies MidpointHistoryEntry
              )
            );
          calls.push(call);
        }
      }

      const logGroups = await Promise.all(calls);
      return logGroups
        .flat()
        .sort((a, b) =>
          a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1
        );
    },
    refetchInterval: 20_000,
  });

  const activeProjects = projects.filter((project) => project.status !== ProjectStatus.Resolved);
  const completedProjects = projects.filter((project) => project.status === ProjectStatus.Resolved);

  const awaitingMyAction = projects.filter((project) => {
    if (!address) return false;

    const isClient = project.client.toLowerCase() === address.toLowerCase();
    const isFreelancer = project.freelancer.toLowerCase() === address.toLowerCase();

    if (project.status === ProjectStatus.AwaitingSubmission && isFreelancer) return true;
    if (project.status === ProjectStatus.UnderReview && isClient) return true;
    if (project.status === ProjectStatus.Disputed && (isClient || isFreelancer)) return true;

    return false;
  });

  const isClientRole = Boolean(address && projects.some((project) => project.client.toLowerCase() === address.toLowerCase()));
  const isFreelancerRole = Boolean(
    address && projects.some((project) => project.freelancer.toLowerCase() === address.toLowerCase())
  );

  const clientProjects = projects.filter(
    (project) => Boolean(address) && project.client.toLowerCase() === address!.toLowerCase()
  );
  const freelancerProjects = projects.filter(
    (project) => Boolean(address) && project.freelancer.toLowerCase() === address!.toLowerCase()
  );

  const pendingSubmissions = freelancerProjects.filter(
    (project) => project.status === ProjectStatus.AwaitingSubmission
  );
  const claimableFunds = freelancerProjects.filter((project) => {
    if (project.status !== ProjectStatus.UnderReview) return false;
    return Number(project.reviewDeadline) * 1000 < Date.now();
  });

  const clientProjectIds = new Set(clientProjects.map((project) => project.id.toString()));
  const freelancerProjectIds = new Set(freelancerProjects.map((project) => project.id.toString()));
  const clientHistory = history.filter((entry) => clientProjectIds.has(entry.projectId.toString()));
  const freelancerHistory = history.filter((entry) => freelancerProjectIds.has(entry.projectId.toString()));

  async function refresh() {
    await queryClient.invalidateQueries();
  }

  async function connectWallet() {
    await connectAsync({ connector: injected() });
  }

  async function sendContractTx(args: {
    abi: typeof midpointEscrowAbi;
    address: Address;
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
  }) {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync(args as never);
    await publicClient.waitForTransactionReceipt({ hash });
    await refresh();
    return hash;
  }

  async function createProjectNative(freelancer: Address, amount: string) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "createProjectNative",
      args: [freelancer],
      value: parseEther(amount),
    });
  }

  async function createProjectUSDC(freelancer: Address, amount: string) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    if (!usdcAddress) throw new Error("Missing NEXT_PUBLIC_USDC_AMOY_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "createProjectERC20",
      args: [usdcAddress, freelancer, parseUnits(amount, 6)],
    });
  }

  async function submitWork(projectId: bigint, ipfsCid: string) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "submitWork",
      args: [projectId, ipfsCid],
    });
  }

  async function approveSubmission(projectId: bigint) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "approveSubmission",
      args: [projectId],
    });
  }

  async function claimTimeoutPayment(projectId: bigint) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "claimTimeoutPayment",
      args: [projectId],
    });
  }

  async function dispute(projectId: bigint) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "dispute",
      args: [projectId],
    });
  }

  async function applyDecayBurn(projectId: bigint) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "applyDecayBurn",
      args: [projectId],
    });
  }

  async function mutualSettlement(projectId: bigint, freelancerCutBps: number) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    return sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "mutualSettlement",
      args: [projectId, BigInt(freelancerCutBps)],
    });
  }

  async function uploadToIpfs(file: File) {
    if (!address || !walletClient) {
      throw new Error("Connect your wallet to upload files.");
    }

    const nonceResponse = await fetch(`/api/ipfs?address=${address}`);
    if (!nonceResponse.ok) {
      const noncePayload = (await nonceResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(noncePayload.error ?? "Failed to get upload nonce");
    }
    const noncePayload = (await nonceResponse.json()) as { nonce: string; message: string };
    const signature = await walletClient.signMessage({
      account: address,
      message: noncePayload.message,
    });

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ipfs", {
      method: "POST",
      headers: {
        "x-midpoint-address": address,
        "x-midpoint-nonce": noncePayload.nonce,
        "x-midpoint-signature": signature,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "IPFS upload failed");
    }

    const payload = (await response.json()) as { cid: string };
    return payload.cid;
  }

  return {
    address,
    isConnected,
    isConnecting,
    isWriting,
    connectWallet,
    disconnect,
    escrowAddress,
    usdcAddress,
    isLoading: isLoadingScopedProjects || isLoadingProjects || isLoadingHistory,
    projects,
    activeProjects,
    completedProjects,
    awaitingMyAction,
    isClientRole,
    isFreelancerRole,
    clientProjects,
    freelancerProjects,
    pendingSubmissions,
    claimableFunds,
    history,
    clientHistory,
    freelancerHistory,
    createProjectNative,
    createProjectUSDC,
    submitWork,
    approveSubmission,
    claimTimeoutPayment,
    dispute,
    applyDecayBurn,
    mutualSettlement,
    uploadToIpfs,
    formatTokenAmount: (amount: bigint, decimals = 18) => formatUnits(amount, decimals),
  };
}
