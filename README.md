# Midpoint

Midpoint is a decentralized escrow dApp on Polygon Amoy that acts like an on-chain Letter of Credit for freelancer projects.

## Features

- Escrow deposits in native POL or ERC20 (USDC).
- Contract states: `AwaitingSubmission`, `UnderReview`, `Disputed`, `Resolved`.
- Freelancer submission by IPFS CID with a strict 14-day review deadline.
- Timeout clause: freelancer can claim full payout after deadline if no action is taken.
- Decaying dispute mode: burns **5% of total escrow every 7 days** to `0x...dEaD`.
- Mutual settlement flow requiring both parties to confirm the same split.

## Project Structure

- `contracts/MidpointEscrow.sol`: escrow contract.
- `scripts/deploy-amoy.js`: Polygon Amoy deployment script.
- `src/hooks/use-midpoint.ts`: wagmi/viem read-write hook for the dApp.
- `src/app/page.tsx`: dashboard UI (mobile-first).
- `src/app/api/ipfs/route.ts`: server route for Pinata IPFS upload.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill in:
- `NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS`
- `NEXT_PUBLIC_USDC_AMOY_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `PINATA_JWT`
- `AMOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`

## Contract Commands

```bash
npm run contract:compile
npm run contract:deploy:amoy
```

## Frontend

```bash
npm run dev
```

Open `http://localhost:3000`.
