# Making Midpoint Public

When making this repo public, ensure sensitive files stay hidden.

## Files That Must Stay Private

These are in `.gitignore` and must **never** be committed:

| File / Pattern | Contains |
|----------------|----------|
| `.env` | All environment variables |
| `.env.local` | Local overrides (Pinata keys, deployer private key, etc.) |
| `.env*.local` | Environment-specific secrets |
| `*.pem` | Private keys / certificates |
| `/node_modules` | Dependencies (reinstall via `npm install`) |
| `/.next/`, `/build/`, `/artifacts/` | Build output |

## What Gets Committed

| File | Purpose |
|------|---------|
| `.env.example` | Template listing required env vars—**placeholder values only, no real secrets** |

## Required Environment Variables (Set Locally)

Copy `.env.example` to `.env.local` and fill with real values:

- **`DEPLOYER_PRIVATE_KEY`** — Wallet private key for contract deployment (never share)
- **`PINATA_JWT`** or **`PINATA_API_KEY`** + **`PINATA_API_SECRET`** — IPFS pinning (server-side only)
- **`POLYGONSCAN_API_KEY`** — For contract verification
- **`NEXT_PUBLIC_*`** — Safe to expose (contract addresses, RPC URLs, WalletConnect project ID)

## Verifying Nothing Sensitive Is Committed

Before pushing:

```bash
# Ensure .env.local is ignored
git check-ignore -v .env.local

# Search for common secret patterns (should return nothing)
git grep -i "private_key\|pinata_secret\|0x[a-fA-F0-9]{64}" -- ":(exclude)*.example" ":(exclude)*.md" ":(exclude)*.sol" || true
```
