import { prisma } from "./prisma";
import { ACTIVE_CHAIN } from "./web3/chains";

// Safety net for the leaderboard/collections: a mint is normally recorded by
// the browser's follow-up POST /api/claims right after the tx confirms, but if
// that request never lands (tab closed, network drop) the wallet would hold the
// badge on-chain with no confirmed Claim row. This re-reads every drop
// contract's mint (Transfer from 0x0) logs and backfills whatever is missing.

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC = `0x${"0".repeat(64)}`;
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

// Routescan's Etherscan-compatible API returns a contract's full log history
// in one call — the public C-Chain RPC caps eth_getLogs at a small block range.
const LOGS_API = `https://api.routescan.io/v2/network/${
  ACTIVE_CHAIN.id === 43114 ? "mainnet" : "testnet"
}/evm/${ACTIVE_CHAIN.id}/etherscan/api`;

export interface MintLog {
  topics: string[];
  transactionHash: string;
  timeStamp: string;
}

export async function fetchMintLogs(contract: string): Promise<MintLog[]> {
  const url = `${LOGS_API}?module=logs&action=getLogs&address=${contract}&fromBlock=0&toBlock=latest&topic0=${TRANSFER_TOPIC}&topic1=${ZERO_TOPIC}&topic0_1_opr=and`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.result)) return [];
  return (data.result as MintLog[]).filter((log) => log.topics?.[1] === ZERO_TOPIC);
}

let lastSyncAt = 0;
let inFlight: Promise<number> | null = null;

// Throttled: runs at most once per SYNC_INTERVAL_MS per server instance, and
// concurrent callers share the same run. Never throws — a failed sync just
// means the leaderboard shows what's already recorded.
export function syncMintsIfStale(): Promise<number> {
  if (inFlight) return inFlight;
  if (Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return Promise.resolve(0);
  lastSyncAt = Date.now();
  inFlight = syncMints()
    .catch(() => 0)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

// Returns how many missing claims were backfilled.
export async function syncMints(): Promise<number> {
  const events = await prisma.event.findMany({ select: { id: true, contractAddress: true } });

  const eventsByContract = new Map<string, string[]>();
  for (const event of events) {
    const key = event.contractAddress.toLowerCase();
    eventsByContract.set(key, [...(eventsByContract.get(key) ?? []), event.id]);
  }

  let backfilled = 0;
  for (const [contract, eventIds] of eventsByContract) {
    // Factory clones are one contract per drop, so a mint maps to exactly one
    // event. Historic drops sharing one contract can't be attributed from the
    // log alone — those are skipped rather than guessed.
    if (eventIds.length !== 1) continue;
    const eventId = eventIds[0];

    const logs = await fetchMintLogs(contract);
    if (logs.length === 0) continue;

    const known = await prisma.claim.findMany({
      where: { eventId, status: "confirmed" },
      select: { txHash: true },
    });
    const knownTx = new Set(known.map((c) => (c.txHash ?? "").toLowerCase()));

    for (const log of logs) {
      if (knownTx.has(log.transactionHash.toLowerCase())) continue;

      const walletAddress = `0x${log.topics[2].slice(26)}`.toLowerCase();
      const tokenId = BigInt(log.topics[3]).toString();
      const claimedAt = new Date(Number(log.timeStamp) * 1000);

      const done = await prisma.$transaction(async (tx) => {
        const existing = await tx.claim.findUnique({
          where: { eventId_walletAddress: { eventId, walletAddress } },
        });
        if (existing?.status === "confirmed") return false;

        if (existing) {
          // A reservation was made (and counted in claimedCount) but never
          // confirmed — promote it.
          await tx.claim.update({
            where: { id: existing.id },
            data: { status: "confirmed", txHash: log.transactionHash, tokenId, claimedAt },
          });
        } else {
          // The reservation expired and was swept, so its slot was released —
          // re-count it alongside the recovered claim.
          await tx.claim.create({
            data: {
              eventId,
              walletAddress,
              status: "confirmed",
              txHash: log.transactionHash,
              tokenId,
              reservedAt: claimedAt,
              claimedAt,
            },
          });
          await tx.event.update({ where: { id: eventId }, data: { claimedCount: { increment: 1 } } });
        }
        return true;
      });
      if (done) backfilled += 1;
    }
  }
  return backfilled;
}
