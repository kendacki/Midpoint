import hre from "hardhat";
const { ethers } = hre;

/**
 * AFTER DEPLOYMENT - Environment Sync Checklist:
 * 1. Copy the NEW Escrow Contract Address from the terminal output (line: "New Escrow Contract Deployed To: ...")
 * 2. Open .env.local
 * 3. Update NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS to the NEW address
 * 4. Restart the frontend development server: npm run dev
 */
/// Polygon Amoy whitelisted USDC (faucet token). Must match frontend NEXT_PUBLIC_USDC_ADDRESS.
const USDC_AMOY_ADDRESS = "0x8B0180f2101c8260d49339abfEe87927412494B4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying MidpointEscrow with ${deployer.address}`);
  console.log(`USDC token (whitelisted): ${USDC_AMOY_ADDRESS}`);

  const midpointEscrowFactory = await ethers.getContractFactory("MidpointEscrow");
  const midpointEscrow = await midpointEscrowFactory.deploy(USDC_AMOY_ADDRESS);
  await midpointEscrow.waitForDeployment();

  const contractAddress = await midpointEscrow.getAddress();
  console.log(`MidpointEscrow deployed to: ${contractAddress}`);
  console.log("New Escrow Contract Deployed To:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
