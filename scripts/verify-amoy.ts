/**
 * Verify MidpointEscrow on PolygonScan (Amoy testnet).
 *
 * Usage:
 *   npm run contract:verify:amoy
 *
 * Requires in .env:
 *   POLYGONSCAN_API_KEY - from https://polygonscan.com/register
 *   NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS - deployed contract address
 */
import hre from "hardhat";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS;

async function main() {
  if (!ESCROW_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS in .env");
  }

  console.log(`Verifying MidpointEscrow at ${ESCROW_ADDRESS} on Polygon Amoy...`);

  await hre.run("verify:verify", {
    address: ESCROW_ADDRESS,
    constructorArguments: [],
  });

  console.log("Contract verified successfully.");
  console.log(`View at: https://amoy.polygonscan.com/address/${ESCROW_ADDRESS}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
