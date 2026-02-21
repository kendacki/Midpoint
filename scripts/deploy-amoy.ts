import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying MidpointEscrow with ${deployer.address}`);

  const midpointEscrowFactory = await ethers.getContractFactory("MidpointEscrow");
  const midpointEscrow = await midpointEscrowFactory.deploy();
  await midpointEscrow.waitForDeployment();

  const contractAddress = await midpointEscrow.getAddress();
  console.log(`MidpointEscrow deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
