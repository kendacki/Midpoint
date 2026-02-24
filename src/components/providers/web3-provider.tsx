"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { queryClient, wagmiConfig } from "@/lib/wagmi";
import { polygonAmoy } from "@/lib/chains";
import { ToastProvider } from "@/lib/toast-context";

export function Web3Provider({
  children,
  cookie,
}: {
  children: React.ReactNode;
  cookie?: string;
}) {
  const initialState = cookie ? cookieToInitialState(wagmiConfig, cookie) : undefined;
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={polygonAmoy}>
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
