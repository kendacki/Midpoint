/**
 * Security audit / brute-force attack simulation for MidpointEscrow
 * Run: npx hardhat test test/MidpointEscrow.security.test.ts
 */
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MidpointEscrow Security Audit", function () {
  let escrow: Awaited<ReturnType<Awaited<ReturnType<typeof ethers.getContractFactory>>["deploy"]>>;
  let client: (typeof ethers.Signer.prototype)[];
  let freelancer: (typeof ethers.Signer.prototype)[];
  let attacker: (typeof ethers.Signer.prototype)[];
  const zeroAddress = ethers.ZeroAddress;

  before(async function () {
    const [, c, f, a] = await ethers.getSigners();
    client = [c];
    freelancer = [f];
    attacker = [a];

    const MidpointEscrow = await ethers.getContractFactory("MidpointEscrow");
    escrow = await MidpointEscrow.deploy();
  });

  describe("Access control bypass attempts", function () {
    it("reverts when non-client calls approveSubmission", async function () {
      await escrow.connect(client[0]).createProjectNative(freelancer[0].address, "Job 1", {
        value: ethers.parseEther("0.1"),
      });
      await escrow.connect(freelancer[0]).submitWork(1n, "QmTest123");

      await expect(escrow.connect(freelancer[0]).approveSubmission(1n)).to.be.revertedWith("Only client");
    });

    it("reverts when non-freelancer calls submitWork", async function () {
      await escrow.connect(client[0]).createProjectNative(freelancer[0].address, "Job 2", {
        value: ethers.parseEther("0.1"),
      });

      await expect(escrow.connect(client[0]).submitWork(2n, "QmFake")).to.be.revertedWith("Only freelancer");
    });

    it("reverts when non-freelancer calls claimTimeoutPayment", async function () {
      await expect(escrow.connect(client[0]).claimTimeoutPayment(1n)).to.be.reverted;
    });

    it("reverts when non-client calls dispute", async function () {
      await expect(escrow.connect(freelancer[0]).dispute(1n)).to.be.revertedWith("Only client");
    });

    it("reverts when attacker calls approveSubmission on valid project", async function () {
      await expect(escrow.connect(attacker[0]).approveSubmission(1n)).to.be.reverted;
    });
  });

  describe("Invalid project / state attacks", function () {
    it("reverts for non-existent project ID", async function () {
      await expect(escrow.connect(client[0]).approveSubmission(99999n)).to.be.revertedWith("Project not found");
      await expect(escrow.connect(freelancer[0]).submitWork(99999n, "QmX")).to.be.revertedWith("Project not found");
    });

    it("reverts submitWork when not in AwaitingSubmission", async function () {
      await expect(escrow.connect(freelancer[0]).submitWork(1n, "QmDoubleSubmit")).to.be.revertedWith("Invalid state");
    });

    it("reverts approveSubmission when not UnderReview", async function () {
      const signers = await ethers.getSigners();
      const c2 = signers[3];
      const f2 = signers[4];
      await escrow.connect(c2).createProjectNative(f2.address, "Job 3", {
        value: ethers.parseEther("0.05"),
      });
      await expect(escrow.connect(c2).approveSubmission(3n)).to.be.revertedWith("Invalid state");
    });

    it("reverts claimTimeoutPayment before review deadline", async function () {
      const signers = await ethers.getSigners();
      const c2 = signers[5];
      const f2 = signers[6];
      await escrow.connect(c2).createProjectNative(f2.address, "Job 4", {
        value: ethers.parseEther("0.05"),
      });
      await escrow.connect(f2).submitWork(4n, "QmTest");
      await expect(escrow.connect(f2).claimTimeoutPayment(4n)).to.be.revertedWith("Review still active");
    });
  });

  describe("Input validation", function () {
    it("reverts createProjectNative with zero value", async function () {
      const signers = await ethers.getSigners();
      await expect(
        escrow.connect(signers[7]).createProjectNative(signers[8].address, "Job", { value: 0n })
      ).to.be.revertedWith("Value required");
    });

    it("reverts createProjectNative with zero freelancer address", async function () {
      const signers = await ethers.getSigners();
      await expect(
        escrow.connect(signers[9]).createProjectNative(zeroAddress, "Job", { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Freelancer required");
    });

    it("reverts createProjectNative with empty description", async function () {
      const signers = await ethers.getSigners();
      await expect(
        escrow.connect(signers[10]).createProjectNative(signers[11].address, "", { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Description required");
    });

    it("reverts submitWork with empty CID", async function () {
      const signers = await ethers.getSigners();
      const c2 = signers[12];
      const f2 = signers[13];
      await escrow.connect(c2).createProjectNative(f2.address, "Job 5", {
        value: ethers.parseEther("0.05"),
      });
      await expect(escrow.connect(f2).submitWork(5n, "")).to.be.revertedWith("CID required");
    });

    it("reverts mutualSettlement with BPS > 10000", async function () {
      const signers = await ethers.getSigners();
      const c2 = signers[14];
      const f2 = signers[15];
      await escrow.connect(c2).createProjectNative(f2.address, "Job 6", {
        value: ethers.parseEther("0.05"),
      });
      await escrow.connect(f2).submitWork(6n, "QmX");
      await escrow.connect(c2).dispute(6n);
      await expect(escrow.connect(c2).mutualSettlement(6n, 10001)).to.be.revertedWith("Invalid split");
    });
  });

  describe("Dispute decay clock", function () {
    it("disputeStartTime is 0 at creation, set on dispute", async function () {
      const signers = await ethers.getSigners();
      const c2 = signers[16];
      const f2 = signers[17];
      await escrow.connect(c2).createProjectNative(f2.address, "Job decay test", {
        value: ethers.parseEther("0.1"),
      });
      const projBefore = await escrow.projects(7n);
      expect(projBefore[6]).to.equal(0n);

      await escrow.connect(f2).submitWork(7n, "QmDecay");
      await escrow.connect(c2).dispute(7n);
      const projAfter = await escrow.projects(7n);
      expect(projAfter[6]).to.be.gt(0n);
    });
  });
});
