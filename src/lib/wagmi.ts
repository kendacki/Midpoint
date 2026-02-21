"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, createStorage, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { polygonAmoy } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = walletConnectProjectId
  ? [
      injected(),
      walletConnect({
        projectId: walletConnectProjectId,
        showQrModal: true,
      }),
    ]
  : [injected()];

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors,
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
});

export const queryClient = new QueryClient();
