# ARC JumpCoin

Payment MVP for a blockchain web game on Arc testnet. The app gates each game session behind one verified ERC-20 token payment.

## Stack

- Monorepo: pnpm workspaces
- Web: Next.js App Router, TypeScript, Tailwind CSS
- Wallet/Web3: wagmi, viem, injected EVM wallets
- Database: Neon Postgres, Prisma
- Contracts: Solidity, Hardhat
- Hosting: GitHub + Vercel

## Project Layout

```text
apps/web              Next.js app, API routes, Prisma schema
packages/contracts    Solidity contracts, deploy scripts, contract tests
```

## Core Flow

```text
Connect Wallet
Check Arc Testnet
Check token balance and allowance
Approve token if needed
Pay fixed play fee
Backend verifies txHash on Arc RPC
Create one DB session
Unlock gameplay placeholder
```

## Environment

Copy `.env.example` into the relevant app/package env files.

Required for `apps/web`:

```text
DATABASE_URL
ARC_RPC_URL
NEXT_PUBLIC_CHAIN_ID
NEXT_PUBLIC_ARC_RPC_URL
NEXT_PUBLIC_TOKEN_ADDRESS
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS
NEXT_PUBLIC_PLAY_FEE
SESSION_TTL_MINUTES
```

Required for `packages/contracts` deploy:

```text
ARC_RPC_URL
PRIVATE_KEY
TOKEN_ADDRESS
TREASURY_ADDRESS
PLAY_FEE
```

## Development

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

The web app runs on `http://localhost:6677` in development.

## Contracts

```bash
pnpm contracts:compile
pnpm contracts:test
pnpm contracts:deploy
```

The V1 payment contract accepts an existing test ERC-20 token, transfers the fixed play fee from the player to treasury, and emits `PaymentReceived`.

## Security Rules

- Backend verifies every transaction server-side.
- A `txHash` can only be used once.
- One verified payment creates one game session.
- Gameplay stays locked until the DB session is created.
- Frontend and backend never custody player tokens.
