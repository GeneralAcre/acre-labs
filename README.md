# Acre Labs

Proof-of-attendance NFTs on Avalanche. An organizer creates a drop with a claim code and a picture; attendees enter the code and the NFT lands in their wallet. No forms, no middlemen.

## How it works

1. **Create** — an organizer sets up a drop: title, image, location, event end time, an optional max supply, and a 6-digit secret code.
2. **Claim** — attendees visit the drop's claim link and enter the code within the claim window (24 hours after the event ends). One claim per wallet, enforced at the database level.
3. **Collect** — the claim is minted from Acre Labs' shared ERC-721 contract on Avalanche and shows up in the attendee's collection.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Prisma 7](https://www.prisma.io) with the Postgres driver adapter
- [Privy](https://www.privy.io) for wallet auth
- [ethers.js](https://docs.ethers.org) for contract calls against Avalanche Fuji (testnet) / C-Chain (mainnet)
- Tailwind CSS 4

> This repo runs Next.js 16, which has meaningfully diverged from older Next.js conventions. Check `node_modules/next/dist/docs/` before assuming an API or file convention still applies.

## Getting started

Install dependencies (this also generates the Prisma client via `postinstall`):

```bash
npm install
```

Create a `.env.local` with:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (used by Prisma Client at runtime) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID for wallet auth |
| `SESSION_SECRET` | Secret used to sign the auth session cookie |
| `VOUCHER_SIGNER_PRIVATE_KEY` | Private key that signs claim vouchers server-side |
| `NEXT_PUBLIC_AVALANCHE_NETWORK` | `mainnet` to claim against Avalanche C-Chain; defaults to Fuji testnet |
| `NEXT_PUBLIC_DROP_CONTRACT_ADDRESS` | Address of the shared drop ERC-721 contract |

Run the database migrations, then start the dev server:

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Project layout

- `app/create` — organizer flow for setting up a drop
- `app/drop/[slug]` — public drop page
- `app/claim/[eventId]` — code-entry claim flow
- `app/collection/[txHash]` — a claimed NFT's confirmation page
- `app/profile/[address]` — a wallet's claimed collection
- `app/api` — auth, claims, events, collectors, and metadata routes
- `lib/web3` — chain config, voucher signing, mint verification
- `prisma/schema.prisma` — `Event` and `Claim` models
