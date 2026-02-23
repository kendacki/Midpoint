# Midpoint Security Tests

This document explains the security test suite and how to run it.

---

## Overview

The security tests simulate attack vectors to verify that the Midpoint escrow system correctly rejects unauthorized access, invalid inputs, and state-machine violations. They act as a **brute-force / penetration test** to ensure access controls and validation logic hold under adversarial conditions.

---

## Contract Security Tests

**Location:** `test/MidpointEscrow.security.test.ts`

**Run:**
```bash
npm run test:security
# or
npx hardhat test test/MidpointEscrow.security.test.ts
```

### What They Validate

| Category | Tests | Purpose |
|----------|-------|---------|
| **Access control bypass** | Non-client calls `approveSubmission` | Only the client can release funds after review |
| | Non-freelancer calls `submitWork` | Only the freelancer can submit deliverables |
| | Non-freelancer calls `claimTimeoutPayment` | Only the freelancer can claim after review timeout |
| | Non-client calls `dispute` | Only the client can initiate a dispute |
| | Attacker calls `approveSubmission` on valid project | Unrelated wallets cannot release funds |
| **Invalid project / state** | Non-existent project ID | All functions revert for missing projects |
| | `submitWork` when not AwaitingSubmission | Work can only be submitted in the correct state |
| | `approveSubmission` when not UnderReview | Approval only allowed during review window |
| | `claimTimeoutPayment` before deadline | Timeout claim only after review window expires |
| **Input validation** | Zero value on `createProjectNative` | Escrow requires non-zero deposit |
| | Zero freelancer address | Freelancer must be a valid address |
| | Empty description | Project description is required |
| | Empty CID on `submitWork` | IPFS CID is required |
| | `mutualSettlement` with BPS > 10000 | Split must be ≤ 100% |
| **Dispute decay clock** | `disputeStartTime` set on dispute, not creation | Decay timer starts when dispute opens, not when project is created |

### Expected Result

All 15 tests should pass. Any failure indicates a security or logic bug that should be fixed before deployment.

---

## IPFS API Brute-Force Tests

**Location:** `scripts/brute-force-api-test.ts`

**Run:**
1. Start the dev server: `npm run dev`
2. In another terminal: `npx tsx scripts/brute-force-api-test.ts`

### What They Validate

| Test | Expected | Purpose |
|------|----------|---------|
| POST without auth headers | 401 | Rejects unauthenticated uploads |
| GET with invalid address | 400 | Rejects malformed address |
| POST with fake nonce/signature | 401 | Rejects forged credentials |
| POST with invalid signature or missing file | 4xx | Rejects bad requests |
| Nonce replay / invalid signature handling | Handled | Replay and invalid sig are rejected |

### Expected Result

All checks should pass. If the dev server is not running, the script will report fetch failures.

---

## Related Documentation

- **SECURITY-AUDIT.md** — Full security audit report with findings, severity ratings, and remediation notes.
- **SECURITY-TESTS.md** (this file) — How to run and interpret the tests.

---

## Dependencies

- `chai` and `@nomicfoundation/hardhat-chai-matchers` for contract assertions
- Hardhat local network (used automatically when running `hardhat test`)
