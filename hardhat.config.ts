import "@nomicfoundation/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import { config as loadEnv } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

loadEnv();
loadEnv({ path: ".env.local", override: true });

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
  etherscan: {
    apiKey: {
      amoy: process.env.POLYGONSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
};

export default config;
