import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createStorage, cookieStorage, fallback, http } from "wagmi";
import { polygonAmoy } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * RPC PROVIDER: To avoid 429 rate limits, use a private RPC URL from Alchemy or QuickNode.
 * Set NEXT_PUBLIC_AMOY_RPC_URL in .env.local / Vercel env vars, e.g.:
 *   Alchemy: https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
 *   QuickNode: https://your-endpoint.polygon-amoy.quiknode.pro/YOUR_TOKEN/
 * If unset, falls back to public RPCs which may be rate-limited.
 */
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
  storage: createStorage({
    storage: cookieStorage,
  }),
});
