# Midpoint Escrow — Security Audit Report

**Date:** February 2025  
**Scope:** MidpointEscrow.sol, IPFS API, Frontend/App code  
**Methodology:** Manual review, static analysis, attack simulation

---

## Executive Summary

The audit identified **1 high-severity** and **2 medium-severity** issues in the smart contract, plus several recommendations for the API and frontend. A brute-force simulation script was run to validate access controls.

---

## Smart Contract: MidpointEscrow.sol

### High Severity

#### 1. Dispute decay clock starts at creation, not dispute time
- **Location:** `_createProject` L246, `dispute()` L164–166
- **Issue:** `disputeStartTime` is set to `block.timestamp` at project creation. When `dispute()` runs, it only updates `disputeStartTime` if it is 0, which it never is. Decay is therefore calculated from creation time, not dispute time.
- **Impact:** Disputes on older projects immediately burn more than intended. Example: project created 21 days ago, disputed today → 3 intervals elapsed → 15% burned on first `applyDecayBurn` instead of 0%.
- **Recommendation:** Initialize `disputeStartTime: 0` in `_createProject` and always set `project.disputeStartTime = block.timestamp` in `dispute()`.

### Medium Severity

#### 2. No ERC20 token whitelist
- **Location:** `createProjectERC20`
- **Issue:** Any ERC20 address can be used. Malicious or non-standard tokens (fee-on-transfer, rebasing, callback/reentrant) can break accounting or enable reentrancy.
- **Impact:** Loss of funds or incorrect accounting with malicious token contracts.
- **Recommendation:** Add a token whitelist or factory pattern and only allow known tokens (e.g. USDC).

#### 3. SafeERC20 / transfer semantics
- **Location:** `_transferFunds`, `IERC20(token).safeTransfer`
- **Status:** Using SafeERC20 is correct for most ERC20s, but fee-on-transfer or rebasing tokens can still cause underpayment.
- **Recommendation:** Whitelist known tokens (e.g. USDC) to avoid edge cases.

### Low Severity / Informational

- **ReentrancyGuard:** Correctly applied on all fund-transferring functions. ✓
- **Access control:** `onlyClient`, `onlyFreelancer`, `onlyProjectParty` used appropriately. ✓
- **Integer math:** Solidity 0.8+ checks prevent overflow/underflow. ✓
- **No upgrade proxy:** Immutable logic reduces upgrade-related risk. ✓

---

## IPFS API (`/api/ipfs`)

### Strengths
- Wallet signature verification with `recoverMessageAddress`
- Nonce bound to address and consumed after use (no replay)
- Per-IP and per-wallet rate limiting
- File type and size restrictions (20MB, MIME whitelist)
- PINATA credentials stored in env vars

### Potential Issues

#### 4. In-memory nonce store
- **Issue:** Nonces are stored in a `Map`. Server restart or multiple instances clear/partition the store.
- **Impact:** Low. Nonces expire in 5 minutes; users can request a new nonce on failure.
- **Recommendation:** For production at scale, consider Redis or similar for nonce storage.

#### 5. IP spoofing via `X-Forwarded-For`
- **Issue:** `getClientIp` trusts `x-forwarded-for` and `x-real-ip`.
- **Impact:** Attackers can spoof IPs and bypass per-IP rate limits if the proxy is not trusted.
- **Recommendation:** Use a trusted reverse proxy and validate forwarded headers, or rely on a CDN/WAF for rate limiting.

---

## Frontend / App Code

### Strengths
- React escapes output, reducing XSS risk
- No raw HTML injection of user content
- Wallet connection via Wagmi with standard patterns
- Environment variables used for config; no hardcoded secrets

### Potential Issues

#### 6. Wallet / address validation
- **Location:** Client page, freelancer address input
- **Issue:** User-supplied freelancer address is passed to `createProjectNative` / `createProjectUSDC` after a simple cast. `isAddress` is not used before submit.
- **Impact:** Invalid addresses can cause transaction revert; UX degrades.
- **Recommendation:** Validate with `isAddress()` before submit and show clear errors.

#### 7. Environment variables
- **Issue:** `NEXT_PUBLIC_*` vars are exposed to the client. No private keys or API secrets use this prefix. ✓
- **Recommendation:** Ensure PINATA keys are never exposed via `NEXT_PUBLIC_*`.

---

## Brute-Force / Attack Simulation Summary

A test script (`scripts/security-audit-test.ts`) was added to simulate:

1. **Access control bypass:** Attempting to call client-only and freelancer-only actions from the wrong role.
2. **Invalid project IDs:** Calling functions with non-existent IDs.
3. **State machine violations:** Submitting work for non-AwaitingSubmission projects, approving non-UnderReview, etc.
4. **IPFS API:** Invalid nonce, wrong signature, missing headers.

Results: All access controls and state checks behave as intended. Unauthorized calls revert; invalid API requests return 401.

---

## Remediation Priority

1. **High:** Fix dispute clock (disputeStartTime initialization).
2. **Medium:** Add ERC20 whitelist or restrict to known tokens.
3. **Low:** Harden IP API (nonce store, IP handling) and add address validation in the UI.

---

## Appendix: Files Audited

- `contracts/MidpointEscrow.sol`
- `src/app/api/ipfs/route.ts`
- `src/hooks/use-midpoint.ts`
- `src/app/client/page.tsx`
- `src/app/freelancer/page.tsx`
- `src/components/midpoint/project-card.tsx`
- `src/lib/abis/midpointEscrow.ts`
- `src/lib/wagmi.ts`
