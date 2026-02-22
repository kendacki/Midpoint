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
import { Address, decodeEventLog, formatUnits, parseAbiItem, parseEther, parseUnits, zeroAddress } from "viem";
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
  createdAt: number;
  submissionCid: string;
  description: string;
  hasSubmissionSignal: boolean;
  hasResolvedSignal: boolean;
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
const projectCreatedEventV1 = parseAbiItem(
  "event ProjectCreated(uint256 indexed projectId,address indexed client,address indexed freelancer,address token,uint256 amount)"
);
const projectCreatedEventV2 = parseAbiItem(
  "event ProjectCreated(uint256 indexed projectId,address indexed client,address indexed freelancer,address token,uint256 amount,string description)"
);
const MIN_AMOY_PRIORITY_FEE = parseUnits("3", 9);
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
  { label: "Project Created", event: projectCreatedEventV1 },
  { label: "Project Created", event: projectCreatedEventV2 },
  { label: "Submitted", event: workSubmittedEvent },
  { label: "Project Disputed", event: projectDisputedEvent },
  { label: "Dispute Burn Applied", event: disputeDecayEvent },
  { label: "Settlement Proposed", event: settlementProposedEvent },
  { label: "Completed (Settlement)", event: projectResolvedEvent },
  { label: "Completed (Timeout Claim)", event: timeoutClaimedEvent },
  { label: "Completed (Released)", event: reviewApprovedEvent },
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
      const normalizedAddress = address.toLowerCase();

      const ids = new Set<bigint>();

      const logGroups = await Promise.all([
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV1,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV1,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
      ]);

      for (const group of logGroups) {
        for (const log of group) {
          if (log.args.projectId) ids.add(log.args.projectId);
        }
      }

      // Always perform a bounded project scan so UI updates even if log indexing is delayed.
      try {
        const nextProjectId = (await publicClient.readContract({
          abi: midpointEscrowAbi,
          address: escrowAddress,
          functionName: "nextProjectId",
        })) as bigint;

        const latestId = nextProjectId > 0n ? nextProjectId - 1n : 0n;
        const minId = latestId > 300n ? latestId - 299n : 1n;
        for (let id = latestId; id >= minId; id -= 1n) {
          const project = (await publicClient.readContract({
            abi: midpointEscrowAbi,
            address: escrowAddress,
            functionName: "projects",
            args: [id],
          })) as RawProject;
          if (!project[9]) continue;
          if (
            project[0].toLowerCase() === normalizedAddress ||
            project[1].toLowerCase() === normalizedAddress
          ) {
            ids.add(id);
          }
          if (id === 1n) break;
        }
      } catch {
        // Keep log-derived ids when bounded scan cannot run.
      }

      return Array.from(ids).sort((a, b) => Number(b - a));
    },
    staleTime: 15_000,
    refetchInterval: 10_000,
  });

  const ids = scopedProjectIds;
  const localDescriptionById: Record<string, string> = (() => {
    if (typeof window === "undefined" || !escrowAddress) return {};
    try {
      const key = `midpoint-local-desc:${escrowAddress.toLowerCase()}`;
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();

  const { data: createdAtById = {}, isLoading: isLoadingCreatedAt } = useQuery({
    queryKey: ["midpoint-created-at", escrowAddress, address, ids.map((id) => id.toString()).join(",")],
    enabled: Boolean(escrowAddress && publicClient && address && ids.length),
    queryFn: async () => {
      if (!escrowAddress || !publicClient || !address || !ids.length) return {} as Record<string, number>;

      const allLogs = await Promise.all([
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV1,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV1,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
      ]);

      const earliestBlockByProject = new Map<bigint, bigint>();
      for (const group of allLogs) {
        for (const log of group) {
          if (!log.args.projectId || !log.blockNumber) continue;
          const current = earliestBlockByProject.get(log.args.projectId);
          if (current === undefined || log.blockNumber < current) {
            earliestBlockByProject.set(log.args.projectId, log.blockNumber);
          }
        }
      }

      const uniqueBlocks = Array.from(new Set(Array.from(earliestBlockByProject.values()).map((v) => v.toString()))).map(
        (v) => BigInt(v)
      );
      const blockTimestampByNumber = new Map<bigint, number>();
      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          const block = await publicClient.getBlock({ blockNumber });
          blockTimestampByNumber.set(blockNumber, Number(block.timestamp));
        })
      );

      const result: Record<string, number> = {};
      for (const [projectId, blockNumber] of earliestBlockByProject.entries()) {
        result[projectId.toString()] = blockTimestampByNumber.get(blockNumber) ?? 0;
      }
      return result;
    },
    refetchInterval: 20_000,
  });

  const { data: statusMetaById = {}, isLoading: isLoadingStatusMeta } = useQuery({
    queryKey: ["midpoint-status-meta", escrowAddress, ids.map((id) => id.toString()).join(",")],
    enabled: Boolean(escrowAddress && publicClient && ids.length),
    queryFn: async () => {
      if (!escrowAddress || !publicClient || !ids.length) {
        return {} as Record<
          string,
          { hasSubmissionSignal: boolean; hasResolvedSignal: boolean; submissionCid: string; resolvedFreelancerAmount: bigint }
        >;
      }

      const entries = await Promise.all(
        ids.map(async (id) => {
          const [submittedLogs, resolvedLogs] = await Promise.all([
            publicClient
              .getLogs({
                address: escrowAddress,
                event: workSubmittedEvent,
                args: { projectId: id },
                fromBlock: 0n,
                toBlock: "latest",
              })
              .catch(() => []),
            publicClient
              .getLogs({
                address: escrowAddress,
                event: projectResolvedEvent,
                args: { projectId: id },
                fromBlock: 0n,
                toBlock: "latest",
              })
              .catch(() => []),
          ]);

          const latestSubmitted = submittedLogs[submittedLogs.length - 1];
          const latestResolved = resolvedLogs[resolvedLogs.length - 1];

          return [
            id.toString(),
            {
              hasSubmissionSignal: submittedLogs.length > 0,
              hasResolvedSignal: resolvedLogs.length > 0,
              submissionCid: (latestSubmitted?.args.ipfsCid as string | undefined) ?? "",
              resolvedFreelancerAmount: (latestResolved?.args.freelancerAmount as bigint | undefined) ?? 0n,
            },
          ] as const;
        })
      );

      return Object.fromEntries(entries);
    },
    refetchInterval: 20_000,
  });

  const { data: eventDescriptionById = {}, isLoading: isLoadingEventDescriptions } = useQuery({
    queryKey: ["midpoint-event-descriptions", escrowAddress, address, ids.map((id) => id.toString()).join(",")],
    enabled: Boolean(escrowAddress && publicClient && address),
    queryFn: async () => {
      if (!escrowAddress || !publicClient || !address) return {} as Record<string, string>;

      const logs = await Promise.all([
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { client: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
        publicClient.getLogs({
          address: escrowAddress,
          event: projectCreatedEventV2,
          args: { freelancer: address },
          fromBlock: 0n,
          toBlock: "latest",
        }).catch(() => []),
      ]);

      const result: Record<string, string> = {};
      for (const group of logs) {
        for (const log of group) {
          const projectId = log.args.projectId;
          const description = log.args.description;
          if (!projectId || !description) continue;
          result[projectId.toString()] = description;
        }
      }
      return result;
    },
    refetchInterval: 20_000,
  });

  const { data: supportsProjectDescription = false } = useQuery({
    queryKey: ["midpoint-supports-project-description", escrowAddress],
    enabled: Boolean(escrowAddress && publicClient),
    queryFn: async () => {
      if (!escrowAddress || !publicClient) return false;
      try {
        await publicClient.readContract({
          abi: midpointEscrowAbi,
          address: escrowAddress,
          functionName: "projectDescriptions",
          args: [1n],
        });
        return true;
      } catch {
        return false;
      }
    },
    staleTime: 60_000,
  });

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
        {
          abi: midpointEscrowAbi,
          address: escrowAddress as Address,
          functionName: "projectDescriptions" as const,
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
        const baseIndex = index * 4;
        const projectResult = contractData[baseIndex];
        const cidResult = contractData[baseIndex + 1];
        const burnResult = contractData[baseIndex + 2];
        const descriptionResult = contractData[baseIndex + 3];
        const statusMeta = statusMetaById[id.toString()];

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
          createdAt: createdAtById[id.toString()] ?? 0,
          submissionCid:
            cidResult?.status === "success" && (cidResult.result as string)
              ? (cidResult.result as string)
              : (statusMeta?.submissionCid ?? ""),
          description:
            descriptionResult?.status === "success" && (descriptionResult.result as string)
              ? (descriptionResult.result as string)
              : (eventDescriptionById[id.toString()] ?? localDescriptionById[id.toString()] ?? ""),
          hasSubmissionSignal: statusMeta?.hasSubmissionSignal ?? false,
          hasResolvedSignal: statusMeta?.hasResolvedSignal ?? false,
          previewBurn: burnResult?.status === "success" ? (burnResult.result as bigint) : 0n,
        } satisfies MidpointProject;
      })
      .filter((project): project is MidpointProject => Boolean(project && project.exists))
      .sort((a, b) => Number(b.id - a.id));
  }, [contractData, createdAtById, eventDescriptionById, ids, localDescriptionById, statusMetaById]);

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["midpoint-history", escrowAddress, address, ids.map((id) => id.toString()).join(",")],
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
            )
            .catch(() => []);
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
    (project) => project.status === ProjectStatus.AwaitingSubmission && !project.submissionCid && !project.hasSubmissionSignal
  );
  const claimableFunds = freelancerProjects.filter((project) => {
    const isUnderReview =
      project.status === ProjectStatus.UnderReview ||
      (project.status === ProjectStatus.AwaitingSubmission && (project.submissionCid || project.hasSubmissionSignal));
    if (!isUnderReview) return false;
    return Number(project.reviewDeadline) * 1000 < Date.now();
  });
  const freelancerReleasedPol = freelancerProjects.reduce((acc, project) => {
    if (project.token !== zeroAddress) return acc;
    return acc + (statusMetaById[project.id.toString()]?.resolvedFreelancerAmount ?? 0n);
  }, 0n);
  const freelancerReleasedUsdc = freelancerProjects.reduce((acc, project) => {
    if (project.token === zeroAddress) return acc;
    return acc + (statusMetaById[project.id.toString()]?.resolvedFreelancerAmount ?? 0n);
  }, 0n);

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
    const feeEstimate = await publicClient.estimateFeesPerGas();
    const txRequest: Record<string, unknown> = { ...args };

    if (feeEstimate.maxFeePerGas || feeEstimate.maxPriorityFeePerGas) {
      const maxPriorityFeePerGas =
        feeEstimate.maxPriorityFeePerGas && feeEstimate.maxPriorityFeePerGas > MIN_AMOY_PRIORITY_FEE
          ? feeEstimate.maxPriorityFeePerGas
          : MIN_AMOY_PRIORITY_FEE;
      const estimatedMaxFee = feeEstimate.maxFeePerGas ?? maxPriorityFeePerGas * 2n;

      txRequest.maxPriorityFeePerGas = maxPriorityFeePerGas;
      txRequest.maxFeePerGas = estimatedMaxFee > maxPriorityFeePerGas ? estimatedMaxFee : maxPriorityFeePerGas * 2n;
    } else if (feeEstimate.gasPrice) {
      txRequest.gasPrice = feeEstimate.gasPrice;
    }

    const hash = await writeContractAsync(txRequest as never);
    await publicClient.waitForTransactionReceipt({ hash });
    await refresh();
    return hash;
  }

  async function saveLocalDescriptionFromReceipt(hash: `0x${string}`, description: string) {
    if (!publicClient || !escrowAddress || typeof window === "undefined") return;
    const trimmed = description.trim();
    if (!trimmed) return;

    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      let projectId: bigint | undefined;

      for (const log of receipt.logs) {
        if (!log.address || log.address.toLowerCase() !== escrowAddress.toLowerCase()) continue;

        try {
          const decodedV2 = decodeEventLog({
            abi: [projectCreatedEventV2],
            data: log.data,
            topics: log.topics,
          });
          if (decodedV2.eventName === "ProjectCreated") {
            projectId = decodedV2.args.projectId as bigint;
            break;
          }
        } catch {
          // Try V1 shape below.
        }

        try {
          const decodedV1 = decodeEventLog({
            abi: [projectCreatedEventV1],
            data: log.data,
            topics: log.topics,
          });
          if (decodedV1.eventName === "ProjectCreated") {
            projectId = decodedV1.args.projectId as bigint;
            break;
          }
        } catch {
          // Ignore unknown logs.
        }
      }

      if (!projectId) return;

      const key = `midpoint-local-desc:${escrowAddress.toLowerCase()}`;
      const existing = window.localStorage.getItem(key);
      const map = existing ? (JSON.parse(existing) as Record<string, string>) : {};
      map[projectId.toString()] = trimmed;
      window.localStorage.setItem(key, JSON.stringify(map));
      await refresh();
    } catch {
      // Best-effort fallback; no-op if unavailable.
    }
  }

  async function createProjectNative(freelancer: Address, amount: string, description: string) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    const sanitizedDescription = description.trim();
    if (!sanitizedDescription) throw new Error("Project description is required");
    const hash = await sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "createProjectNative",
      args: supportsProjectDescription ? [freelancer, sanitizedDescription] : [freelancer],
      value: parseEther(amount),
    });
    await saveLocalDescriptionFromReceipt(hash, sanitizedDescription);
    return hash;
  }

  async function createProjectUSDC(freelancer: Address, amount: string, description: string) {
    if (!escrowAddress) throw new Error("Missing NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS");
    if (!usdcAddress) throw new Error("Missing NEXT_PUBLIC_USDC_AMOY_ADDRESS");
    const sanitizedDescription = description.trim();
    if (!sanitizedDescription) throw new Error("Project description is required");
    const hash = await sendContractTx({
      abi: midpointEscrowAbi,
      address: escrowAddress,
      functionName: "createProjectERC20",
      args: supportsProjectDescription
        ? [usdcAddress, freelancer, parseUnits(amount, 6), sanitizedDescription]
        : [usdcAddress, freelancer, parseUnits(amount, 6)],
    });
    await saveLocalDescriptionFromReceipt(hash, sanitizedDescription);
    return hash;
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
    isLoading:
      isLoadingScopedProjects ||
      isLoadingProjects ||
      isLoadingHistory ||
      isLoadingCreatedAt ||
      isLoadingStatusMeta ||
      isLoadingEventDescriptions,
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
    freelancerReleasedPol,
    freelancerReleasedUsdc,
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
