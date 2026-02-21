# Midpoint

Midpoint is an on-chain escrow platform for freelancers and clients.

Think of it as a digital middle ground:
- the client locks payment in escrow
- the freelancer submits work
- both sides are protected by transparent smart-contract rules

Built on Polygon Amoy with a clean wallet-first dashboard.

## How It Works

1. Client creates a project and funds escrow (POL or USDC).
2. Freelancer submits work using an IPFS CID.
3. Client reviews and either approves, disputes, or does nothing.
4. If the review time expires, the freelancer can claim timeout payment.

Disputes include Midpoint's "decay pressure" model:
- unresolved disputes burn 5% of total escrow every 7 days.

## Main Features

- Wallet-based identity (no email signup/login).
- Role views for Client and Freelancer dashboards.
- On-chain privacy filtering (only your relevant projects).
- 14-day review countdown UI.
- IPFS upload flow handled through backend API route.
- Dispute settlement + timeout claim logic.

## Tech Stack

- Next.js (App Router) + Tailwind CSS
- Wagmi + Viem + RainbowKit
- Solidity + OpenZeppelin + Hardhat
- Pinata IPFS integration (server-side)

## Quick Start

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`:
- `NEXT_PUBLIC_MIDPOINT_ESCROW_ADDRESS`
- `NEXT_PUBLIC_USDC_AMOY_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `PINATA_API_KEY`
- `PINATA_API_SECRET` (or `PINATA_JWT`)
- `AMOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`

## Smart Contract Commands

```bash
npm run contract:compile
npm run contract:deploy:amoy
```

## Run The App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy To Vercel

1. Push to GitHub.
2. Import repo in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

Important: keep secrets (`PINATA_API_SECRET`, `PINATA_JWT`, `DEPLOYER_PRIVATE_KEY`) server-side only.
