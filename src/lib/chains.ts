import { defineChain } from "viem";

export const polygonAmoy = defineChain({
  id: 80_002,
  name: "Polygon Amoy",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/amoy",
    },
  },
  testnet: true,
});
