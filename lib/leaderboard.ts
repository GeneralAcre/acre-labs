import { prisma } from "./prisma";
import { listCollectors } from "./store";
import type { LeaderboardEntry } from "./types";

// Every confirmed badge claim is worth BADGE_POINTS; every Content member
// card (one per community, credited to the wallet whose profile links that X
// handle) is worth MEMBER_CARD_POINTS.
export const BADGE_POINTS = 10;
export const MEMBER_CARD_POINTS = 5;

const LEVELS = [
  { min: 100, name: "Legend" },
  { min: 50, name: "Collector" },
  { min: 20, name: "Explorer" },
  { min: 0, name: "Newcomer" },
] as const;

export function levelFor(points: number): { level: number; name: string } {
  const index = LEVELS.findIndex((l) => points >= l.min);
  return { level: LEVELS.length - index, name: LEVELS[index].name };
}

const MAX_ENTRIES = 100;

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [collectors, profiles, checkIns] = await Promise.all([
    listCollectors(),
    prisma.profile.findMany(),
    prisma.checkIn.findMany({ select: { xHandle: true } }),
  ]);

  const cardsByHandle = new Map<string, number>();
  for (const c of checkIns) cardsByHandle.set(c.xHandle, (cardsByHandle.get(c.xHandle) ?? 0) + 1);
  const profileByAddress = new Map(profiles.map((p) => [p.address, p]));

  const addresses = new Set<string>(collectors.map((c) => c.walletAddress));
  // Wallets with no badges yet still rank if they've linked a member card.
  for (const p of profiles) {
    if (p.xHandle && cardsByHandle.has(p.xHandle)) addresses.add(p.address);
  }

  const collectorByAddress = new Map(collectors.map((c) => [c.walletAddress, c]));
  const entries = Array.from(addresses).map((address) => {
    const profile = profileByAddress.get(address);
    const collector = collectorByAddress.get(address);
    const badges = collector?.dropCount ?? 0;
    const memberCards = profile?.xHandle ? cardsByHandle.get(profile.xHandle) ?? 0 : 0;
    const points = badges * BADGE_POINTS + memberCards * MEMBER_CARD_POINTS;
    return {
      address,
      displayName: profile?.displayName ?? null,
      xHandle: profile?.xHandle ?? null,
      badges,
      memberCards,
      points,
      lastActiveAt: collector?.lastClaimedAt ?? null,
      ...levelFor(points),
    };
  });

  // Ties go to whoever got there first (earlier last claim), then address
  // for a stable order.
  entries.sort(
    (a, b) =>
      b.points - a.points ||
      (a.lastActiveAt ?? Infinity) - (b.lastActiveAt ?? Infinity) ||
      a.address.localeCompare(b.address)
  );

  return entries.slice(0, MAX_ENTRIES).map((entry, i) => ({ ...entry, rank: i + 1 }));
}
