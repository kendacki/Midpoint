"use client";

import { QueryClient } from "@tanstack/react-query";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { fallback, http } from "wagmi";
import { polygonAmoy } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const preferredAmoyRpc = process.env.NEXT_PUBLIC_AMOY_RPC_URL;

const amoyFallbackUrls = [
  preferredAmoyRpc,
  ...polygonAmoy.rpcUrls.default.http,
  "https://rpc.ankr.com/polygon_amoy",
].filter((url): url is string => Boolean(url));

export const wagmiConfig = getDefaultConfig({
  appName: "Midpoint",
  projectId: walletConnectProjectId || "missing-walletconnect-project-id",
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: fallback(amoyFallbackUrls.map((url) => http(url))),
  },
  ssr: true,
});

export const queryClient = new QueryClient();
