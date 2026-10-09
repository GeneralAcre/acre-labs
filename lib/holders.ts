import { prisma } from "./prisma";
import { fetchMintLogs } from "./mintSync";
import type { BadgeHolder } from "./types";

// Short in-memory cache per contract so a busy claim page doesn't hit the
// explorer API on every view.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; holders: BadgeHolder[] }>();

// Everyone who minted a drop, read straight from the chain (the same mint
// Transfer events Snowtrace shows), oldest first, with display names from
// their AcreLabs profiles where set.
export async function getBadgeHolders(eventId: string): Promise<BadgeHolder[] | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, contractAddress: true },
  });
  if (!event) return null;

  const cached = cache.get(event.id);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.holders;

  let logs = await fetchMintLogs(event.contractAddress);

  // Historic drops share one contract, so the chain alone can't tell which
  // drop a mint belongs to — narrow to the mints recorded for this event.
  const sharing = await prisma.event.count({
    where: { contractAddress: { equals: event.contractAddress, mode: "insensitive" } },
  });
  if (sharing > 1) {
    const claims = await prisma.claim.findMany({
      where: { eventId: event.id, status: "confirmed" },
      select: { txHash: true },
    });
    const txs = new Set(claims.map((c) => (c.txHash ?? "").toLowerCase()));
    logs = logs.filter((log) => txs.has(log.transactionHash.toLowerCase()));
  }

  const addresses = logs.map((log) => `0x${log.topics[2].slice(26)}`.toLowerCase());
  const profiles = addresses.length
    ? await prisma.profile.findMany({ where: { address: { in: addresses } } })
    : [];
  const nameByAddress = new Map(profiles.map((p) => [p.address, p.displayName]));

  const holders = logs
    .map((log, i) => ({
      address: addresses[i],
      displayName: nameByAddress.get(addresses[i]) ?? null,
      tokenId: BigInt(log.topics[3]).toString(),
      txHash: log.transactionHash,
      mintedAt: Number(log.timeStamp) * 1000,
    }))
    .sort((a, b) => a.mintedAt - b.mintedAt);

  cache.set(event.id, { at: Date.now(), holders });
  return holders;
}
