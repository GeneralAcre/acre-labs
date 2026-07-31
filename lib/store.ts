import { Prisma, type Event as PrismaEvent, type Claim as PrismaClaim } from "@prisma/client";
import { prisma } from "./prisma";
import { generateSecretCode, normalizeCode } from "./code";
import { SHARED_DROP_CONTRACT_ADDRESS } from "./web3/chains";
import type {
  ClaimRecord,
  CollectedClaim,
  EventRecord,
  PublicEvent,
  PublicEventWithSupply,
} from "./types";

// eventEndTime is already end-of-day (23:59:59.999) for the selected date —
// adding a full day lands the deadline at end-of-day on the *next* calendar
// date, so an event ending today stays claimable through all of tomorrow.
const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

// A pending reservation is abandoned (and its slot freed) if it's never
// confirmed within this window — covers a wallet that rejected the tx or a
// user who never finished the flow, without holding a maxSupply slot forever.
const RESERVATION_TTL_MINUTES = 10;
const RESERVATION_TTL_MS = RESERVATION_TTL_MINUTES * 60 * 1000;

function toEventRecord(row: PrismaEvent): EventRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    contractAddress: row.contractAddress,
    secretCode: row.secretCode,
    eventEndTime: row.eventEndTime.getTime(),
    expiresAt: row.expiresAt.getTime(),
    createdAt: row.createdAt.getTime(),
    imageUrl: row.imageUrl ?? undefined,
    maxSupply: row.maxSupply ?? undefined,
    ownerAddress: row.ownerAddress,
  };
}

function toClaimRecord(row: PrismaClaim): ClaimRecord {
  return {
    eventId: row.eventId,
    walletAddress: row.walletAddress,
    status: row.status,
    txHash: row.txHash,
    tokenId: row.tokenId,
    reservedAt: row.reservedAt.getTime(),
    claimedAt: row.claimedAt ? row.claimedAt.getTime() : null,
  };
}

function isPendingExpired(claim: { status: string; reservedAt: Date }): boolean {
  return claim.status === "pending" && Date.now() - claim.reservedAt.getTime() > RESERVATION_TTL_MS;
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "drop";
}

function generateSlugCandidate(title: string): string {
  const suffix = Math.floor(100000 + Math.random() * 900000); // 6-digit
  return `${slugifyTitle(title)}-${suffix}`;
}

const MAX_SLUG_ATTEMPTS = 5;

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  eventEndTime: number;
  imageUrl?: string;
  maxSupply?: number;
  ownerAddress: string;
}

export async function createEvent(input: CreateEventInput): Promise<EventRecord> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = generateSlugCandidate(input.title);
    try {
      const created = await prisma.event.create({
        data: {
          slug,
          title: input.title,
          description: input.description,
          location: input.location,
          contractAddress: SHARED_DROP_CONTRACT_ADDRESS,
          secretCode: generateSecretCode(),
          eventEndTime: new Date(input.eventEndTime),
          expiresAt: new Date(input.eventEndTime + CLAIM_WINDOW_MS),
          imageUrl: input.imageUrl,
          maxSupply: input.maxSupply,
          ownerAddress: input.ownerAddress.toLowerCase(),
        },
      });
      return toEventRecord(created);
    } catch (err) {
      const isSlugCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("slug");
      if (isSlugCollision && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  throw new Error("Failed to generate a unique slug.");
}

export async function listEvents(): Promise<EventRecord[]> {
  const rows = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toEventRecord);
}

export async function listEventsByOwner(ownerAddress: string): Promise<EventRecord[]> {
  const normalized = ownerAddress.toLowerCase();
  const rows = await prisma.event.findMany({
    where: { ownerAddress: normalized },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEventRecord);
}

export async function getEvent(id: string): Promise<EventRecord | undefined> {
  const row = await prisma.event.findUnique({ where: { id } });
  return row ? toEventRecord(row) : undefined;
}

// Public claim links use the slug, not the raw id — everything downstream
// (validateAndReserveClaim, the voucher digest, on-chain hasClaimed) still
// keys off the resolved `id`, so the slug never has to be plumbed any
// further than this one lookup.
export async function getEventBySlug(slug: string): Promise<EventRecord | undefined> {
  const row = await prisma.event.findUnique({ where: { slug } });
  return row ? toEventRecord(row) : undefined;
}

export function toPublicEvent(record: EventRecord): PublicEvent {
  const { secretCode: _secretCode, ownerAddress: _ownerAddress, ...publicFields } = record;
  return publicFields;
}

// Also lazily releases any expired pending reservations for this event (same
// idea as the old in-memory store's evict-on-read) so the displayed count
// self-heals without a separate cron job.
export async function getClaimCount(eventId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ claimedCount: number }[]>`
    WITH expired AS (
      DELETE FROM "Claim"
      WHERE "eventId" = ${eventId} AND status = 'pending'
        AND "reservedAt" < now() - (${RESERVATION_TTL_MINUTES} * interval '1 minute')
      RETURNING id
    )
    UPDATE "Event"
    SET "claimedCount" = "claimedCount" - (SELECT COUNT(*)::int FROM expired)
    WHERE id = ${eventId}
    RETURNING "claimedCount"
  `;
  return rows[0]?.claimedCount ?? 0;
}

export async function toPublicEventWithSupply(record: EventRecord): Promise<PublicEventWithSupply> {
  const claimedCount = await getClaimCount(record.id);
  return { ...toPublicEvent(record), claimedCount };
}

export type ClaimFailureReason =
  | "not_found"
  | "invalid_code"
  | "expired"
  | "sold_out"
  | "already_claimed";
export type ClaimResult =
  | { ok: true; event: EventRecord }
  | { ok: false; reason: ClaimFailureReason };

// Validates the code and reserves the wallet's slot inside one DB
// transaction. The capacity check is a single atomic conditional UPDATE
// (claimedCount = claimedCount + 1 WHERE claimedCount < maxSupply) — Postgres
// takes a row lock on the Event row for that UPDATE, so two concurrent
// requests for the same event serialize there and can never both win the
// last slot, even across multiple server instances (unlike the old
// in-memory version, which only held under a single Node process).
export async function validateAndReserveClaim(
  eventId: string,
  code: string,
  walletAddress: string
): Promise<ClaimResult> {
  const normalizedWallet = walletAddress.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) return { ok: false, reason: "not_found" };

    if (Date.now() > event.expiresAt.getTime()) {
      return { ok: false, reason: "expired" };
    }

    const existing = await tx.claim.findUnique({
      where: { eventId_walletAddress: { eventId, walletAddress: normalizedWallet } },
    });

    if (existing) {
      if (isPendingExpired(existing)) {
        // Abandoned reservation (wallet never confirmed) — free its slot.
        await tx.claim.delete({ where: { id: existing.id } });
        await tx.event.update({
          where: { id: eventId },
          data: { claimedCount: { decrement: 1 } },
        });
      } else {
        return { ok: false, reason: "already_claimed" };
      }
    }

    if (normalizeCode(code) !== event.secretCode) {
      return { ok: false, reason: "invalid_code" };
    }

    const reserved = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Event"
      SET "claimedCount" = "claimedCount" + 1
      WHERE id = ${eventId} AND ("maxSupply" IS NULL OR "claimedCount" < "maxSupply")
      RETURNING id
    `;
    if (reserved.length === 0) {
      return { ok: false, reason: "sold_out" };
    }

    try {
      await tx.claim.create({
        data: {
          eventId,
          walletAddress: normalizedWallet,
          status: "pending",
          reservedAt: new Date(),
        },
      });
    } catch (err) {
      // Unique (eventId, walletAddress) violation — a concurrent request for
      // the same wallet won the race between our duplicate check above and
      // here. Give back the slot we just reserved.
      await tx.event.update({
        where: { id: eventId },
        data: { claimedCount: { decrement: 1 } },
      });
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { ok: false, reason: "already_claimed" };
      }
      throw err;
    }

    return { ok: true, event: toEventRecord(event) };
  });
}

// Frees a pending reservation immediately — called when the on-chain claim
// fails client-side (insufficient funds, rejected in wallet, RPC error)
// before a tx ever broadcasts, so the wallet can retry right away instead of
// waiting out RESERVATION_TTL_MINUTES. Never touches a confirmed claim.
export async function releasePendingClaim(
  eventId: string,
  walletAddress: string
): Promise<boolean> {
  const normalizedWallet = walletAddress.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.claim.deleteMany({
      where: { eventId, walletAddress: normalizedWallet, status: "pending" },
    });
    if (count === 0) return false;

    await tx.event.update({
      where: { id: eventId },
      data: { claimedCount: { decrement: count } },
    });
    return true;
  });
}

export interface ConfirmClaimInput {
  eventId: string;
  walletAddress: string;
  txHash: string;
  tokenId: string | null;
}

// Upgrades an existing pending reservation to confirmed — never creates a
// claim from scratch, so confirming requires having gone through
// validateAndReserveClaim (the code check) first. Returns null if there's no
// matching pending reservation (already confirmed, expired and swept, or the
// reservation never existed — e.g. someone calling this route directly).
export async function confirmClaim(input: ConfirmClaimInput): Promise<ClaimRecord | null> {
  const normalizedWallet = input.walletAddress.toLowerCase();

  const { count } = await prisma.claim.updateMany({
    where: { eventId: input.eventId, walletAddress: normalizedWallet, status: "pending" },
    data: {
      status: "confirmed",
      txHash: input.txHash,
      tokenId: input.tokenId,
      claimedAt: new Date(),
    },
  });
  if (count === 0) return null;

  const updated = await prisma.claim.findUnique({
    where: { eventId_walletAddress: { eventId: input.eventId, walletAddress: normalizedWallet } },
  });
  return updated ? toClaimRecord(updated) : null;
}

export async function listClaimsByWallet(walletAddress: string): Promise<CollectedClaim[]> {
  const normalized = walletAddress.toLowerCase();
  const rows = await prisma.claim.findMany({
    where: { walletAddress: normalized, status: "confirmed" },
    include: { event: true },
    orderBy: { claimedAt: "desc" },
  });

  return rows
    .filter((row) => row.txHash !== null && row.claimedAt !== null)
    .map((row) => ({
      eventId: row.eventId,
      walletAddress: row.walletAddress,
      txHash: row.txHash as string,
      tokenId: row.tokenId,
      claimedAt: (row.claimedAt as Date).getTime(),
      event: toPublicEvent(toEventRecord(row.event)),
    }));
}

export interface CollectorSummary {
  walletAddress: string;
  dropCount: number;
  lastClaimedAt: number;
}

export async function listCollectors(): Promise<CollectorSummary[]> {
  const rows = await prisma.claim.findMany({
    where: { status: "confirmed" },
    select: { walletAddress: true, claimedAt: true },
  });

  const summary = new Map<string, CollectorSummary>();
  for (const row of rows) {
    if (!row.claimedAt) continue;
    const claimedAt = row.claimedAt.getTime();
    const existing = summary.get(row.walletAddress);
    if (existing) {
      existing.dropCount += 1;
      existing.lastClaimedAt = Math.max(existing.lastClaimedAt, claimedAt);
    } else {
      summary.set(row.walletAddress, {
        walletAddress: row.walletAddress,
        dropCount: 1,
        lastClaimedAt: claimedAt,
      });
    }
  }

  return Array.from(summary.values()).sort((a, b) => b.lastClaimedAt - a.lastClaimedAt);
}

export async function getClaimByTxHash(txHash: string): Promise<CollectedClaim | undefined> {
  const row = await prisma.claim.findFirst({
    where: { txHash, status: "confirmed" },
    include: { event: true },
  });
  if (!row || !row.txHash || !row.claimedAt) return undefined;

  return {
    eventId: row.eventId,
    walletAddress: row.walletAddress,
    txHash: row.txHash,
    tokenId: row.tokenId,
    claimedAt: row.claimedAt.getTime(),
    event: toPublicEvent(toEventRecord(row.event)),
  };
}
