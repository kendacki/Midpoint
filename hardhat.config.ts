import "@nomicfoundation/hardhat-ethers";
import { config as loadEnv } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

loadEnv();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const AMOY_RPC_URL = process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    amoy: {
      url: AMOY_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
};

export default config;
