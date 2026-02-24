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
4. before the review time expires, the freelancer can create dispute.

Disputes include Midpoint's "decay pressure" model:
- unresolved disputes burn 5% of total escrow every 14 days.

## Main Features

- Wallet-based identity (no email signup/login).
- Role views for Client and Freelancer dashboards.
- On-chain privacy filtering (only your relevant projects).
- 14-day review countdown UI.
- IPFS upload flow handled through backend API route.
- Dispute settlement + timeout claim logic.

## Next Steps & Roadmap 

Multi-Tranche Milestone Smart Contracts:

The escrow handles single, lump-sum payouts upon project completion.
Upgrade: Expanding the Solidity smart contract to support milestone-based funding. 
Clients will be able to lock the total project vault upfront, 
but release tokens (USDC/POL) in incremental percentages (e.g., 25%, 50%, 25%) 
as the freelancer hits specific, predefined deliverables.

Decentralized Arbitration Protocol:

Disputes are routed via an automated email ticketing
system to a central admin.
Upgrade: Replacing the centralized email routing with an on-chain
arbitration layer. In the event of a dispute, the funds remain locked
while the case is securely routed to a decentralized arbitration protocol
(such as Kleros) or a multi-sig committee to ensure fair,
trustless resolution without platform bias.

Gasless Transactions via Account Abstraction (ERC-4337):

Freelancers and clients need native POL in their wallets to pay 
for gas when interacting with the escrow or claiming funds.
Upgrade: Integrating a paymaster (like Biconomy or Alchemy's Gas Manager) 
to sponsor transaction fees. This allows clients to fund escrows and 
freelancers to claim their USDC without ever needing to understand 
or purchase native gas tokens, achieving true Web2-level UX.

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
