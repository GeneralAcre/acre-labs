import { Prisma, type CheckIn as PrismaCheckIn } from "@prisma/client";
import { prisma } from "./prisma";
import type { CheckInRecord, CommunityRecord } from "./types";
import { DEFAULT_ACCENT_COLOR, DEFAULT_CARD_COLOR, isHexColor } from "./color";
import { CARD_PREFIX_RE, normalizeCardPrefix } from "./memberId";

const MAX_COMMUNITY_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 280;
const MAX_MEMBER_NAME_LENGTH = 60;
const MAX_ROLE_LENGTH = 30;
const MAX_PLACE_LENGTH = 80;
// Inline data: URIs — logos are compressed to 512px, avatars to 256px
// client-side, so these only reject payloads that skipped that step.
const MAX_LOGO_BYTES = 1024 * 1024;
// Card backgrounds are cropped to the card shape and re-encoded as JPEG.
const MAX_CARD_IMAGE_BYTES = 1536 * 1024;
const MAX_AVATAR_BYTES = 512 * 1024;
// X handles are 1-15 characters, letters/digits/underscore.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|webp|gif);base64,/;
// Slugs that would collide with real routes: /content/* pages and
// /api/communities/cards.
const RESERVED_SLUGS = new Set(["claim", "create", "new", "cards"]);

// Two community names count as the same when they only differ in case,
// spaces or punctuation: "team1 Thailand" = "Team 1 Thailand".
export function communityNameKey(name: string): string {
  // \p{M} keeps combining marks, e.g. Thai vowels, part of the key.
  return name.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

// Name of the existing community this name would clash with, if any.
export async function findCommunityNameClash(name: string): Promise<string | null> {
  const nameKey = communityNameKey(name.trim());
  if (!nameKey) return null;
  const row = await prisma.community.findUnique({ where: { nameKey }, select: { name: true } });
  return row?.name ?? null;
}

// Case-insensitive and tolerant of a leading "@" so "@Acre" and "acre" collide.
export function normalizeXHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function toCheckInRecord(row: PrismaCheckIn, memberNo: number): CheckInRecord {
  return {
    id: row.id,
    name: row.name,
    xHandle: row.xHandle,
    avatarUrl: row.avatarUrl,
    role: row.role,
    memberNo,
    createdAt: row.createdAt.getTime(),
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "community"
  );
}

type CommunityRow = Prisma.CommunityGetPayload<{ include: { _count: { select: { members: true } } } }>;

async function toCommunityRecords(rows: CommunityRow[]): Promise<CommunityRecord[]> {
  const owners = rows.map((r) => r.ownerAddress).filter((a): a is string => !!a);
  const profiles = owners.length
    ? await prisma.profile.findMany({ where: { address: { in: owners } } })
    : [];
  const nameByAddress = new Map(profiles.map((p) => [p.address, p.displayName]));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    cardColor: row.cardColor,
    accentColor: row.accentColor,
    issueDate: row.issueDate ? row.issueDate.getTime() : null,
    cardPrefix: row.cardPrefix,
    cardImage: row.cardImage,
    kind: row.kind === "event" ? "event" : "community",
    place: row.place,
    ownerAddress: row.ownerAddress,
    creatorName: row.ownerAddress
      ? nameByAddress.get(row.ownerAddress) ?? shortenAddress(row.ownerAddress)
      : "AcreLabs",
    memberCount: row._count.members,
    createdAt: row.createdAt.getTime(),
  }));
}

const withCount = { _count: { select: { members: true } } } as const;

export async function listCommunities(): Promise<CommunityRecord[]> {
  const rows = await prisma.community.findMany({ include: withCount });
  const records = await toCommunityRecords(rows);
  // Busiest communities first, then newest.
  return records.sort((a, b) => b.memberCount - a.memberCount || b.createdAt - a.createdAt);
}

export async function getCommunityBySlug(
  slug: string
): Promise<{ community: CommunityRecord; members: CheckInRecord[] } | null> {
  const row = await prisma.community.findUnique({ where: { slug }, include: withCount });
  if (!row) return null;
  const [community] = await toCommunityRecords([row]);
  const members = await prisma.checkIn.findMany({
    where: { communityId: row.id },
    orderBy: { createdAt: "desc" },
  });
  // Newest first; member numbers count up from the earliest join.
  return {
    community,
    members: members.map((member, index) => toCheckInRecord(member, members.length - index)),
  };
}

export type CreateCommunityFailure =
  | "invalid_name"
  | "invalid_description"
  | "invalid_image"
  | "invalid_issue_date"
  | "invalid_card_prefix"
  | "invalid_card_image"
  | "name_taken"
  | "invalid_place";

// "YYYY-MM-DD" from a native date input → that calendar day at 12:00 UTC, so
// it renders as the same date in every timezone from UTC-11 to UTC+11.
function parseIssueDate(value: string | undefined): Date | null | "invalid" {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export type CreateCommunityResult =
  | { ok: true; community: CommunityRecord }
  | { ok: false; reason: CreateCommunityFailure };

export async function createCommunity(
  ownerAddress: string,
  input: {
    name: string;
    description: string;
    imageUrl?: string;
    cardColor?: string;
    accentColor?: string;
    issueDate?: string;
    cardPrefix?: string;
    cardImage?: string;
    kind?: string;
    place?: string;
  }
): Promise<CreateCommunityResult> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_COMMUNITY_NAME_LENGTH) return { ok: false, reason: "invalid_name" };

  const description = input.description.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) return { ok: false, reason: "invalid_description" };

  const issueDate = parseIssueDate(input.issueDate);
  if (issueDate === "invalid") return { ok: false, reason: "invalid_issue_date" };

  // Optional; empty falls back to the first two letters of the name.
  const cardPrefix = normalizeCardPrefix(input.cardPrefix ?? "") || null;
  if (cardPrefix && !CARD_PREFIX_RE.test(cardPrefix)) return { ok: false, reason: "invalid_card_prefix" };

  // Logo is optional (the card headline is just the community name).
  const imageUrl = input.imageUrl || null;
  if (imageUrl && (!IMAGE_DATA_URL_RE.test(imageUrl) || imageUrl.length > MAX_LOGO_BYTES)) {
    return { ok: false, reason: "invalid_image" };
  }

  const cardImage = input.cardImage || null;
  if (cardImage && (!IMAGE_DATA_URL_RE.test(cardImage) || cardImage.length > MAX_CARD_IMAGE_BYTES)) {
    return { ok: false, reason: "invalid_card_image" };
  }

  const kind = input.kind === "event" ? "event" : "community";
  // Only events have a place; it's ignored for communities.
  const place = kind === "event" ? (input.place ?? "").trim().replace(/\s+/g, " ") || null : null;
  if (place && place.length > MAX_PLACE_LENGTH) return { ok: false, reason: "invalid_place" };

  const nameKey = communityNameKey(name);
  if (!nameKey) return { ok: false, reason: "invalid_name" };
  if (await findCommunityNameClash(name)) return { ok: false, reason: "name_taken" };

  // Readable slug first; on a collision fall back to a random suffix.
  const base = slugify(name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0 && !RESERVED_SLUGS.has(base)
        ? base
        : `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const row = await prisma.community.create({
        data: {
          slug,
          name,
          description: description || null,
          imageUrl,
          issueDate,
          cardPrefix,
          cardImage,
          nameKey,
          kind,
          place,
          cardColor: (isHexColor(input.cardColor) ? input.cardColor : DEFAULT_CARD_COLOR).toLowerCase(),
          accentColor: (isHexColor(input.accentColor) ? input.accentColor : DEFAULT_ACCENT_COLOR).toLowerCase(),
          ownerAddress: ownerAddress.toLowerCase(),
        },
        include: withCount,
      });
      const [community] = await toCommunityRecords([row]);
      return { ok: true, community };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Someone took the same name in the meantime; otherwise it was the slug.
        if (await findCommunityNameClash(name)) return { ok: false, reason: "name_taken" };
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not generate a unique community slug");
}

export type JoinFailure =
  | "not_found"
  | "invalid_name"
  | "invalid_handle"
  | "invalid_role"
  | "invalid_avatar"
  | "already_member";
export type JoinResult = { ok: true; member: CheckInRecord } | { ok: false; reason: JoinFailure };

export async function joinCommunity(
  slug: string,
  input: { name: string; xHandle: string; role?: string | null; avatarUrl?: string | null }
): Promise<JoinResult> {
  const community = await prisma.community.findUnique({ where: { slug }, select: { id: true, kind: true } });
  if (!community) return { ok: false, reason: "not_found" };

  const name = input.name.trim();
  if (!name || name.length > MAX_MEMBER_NAME_LENGTH) return { ok: false, reason: "invalid_name" };

  const xHandle = normalizeXHandle(input.xHandle);
  if (!HANDLE_RE.test(xHandle)) return { ok: false, reason: "invalid_handle" };

  // Event passes have no role.
  const role = community.kind === "event" ? null : (input.role ?? "").trim().replace(/\s+/g, " ") || null;
  if (role && role.length > MAX_ROLE_LENGTH) return { ok: false, reason: "invalid_role" };

  const avatarUrl = input.avatarUrl || null;
  if (avatarUrl && (!IMAGE_DATA_URL_RE.test(avatarUrl) || avatarUrl.length > MAX_AVATAR_BYTES)) {
    return { ok: false, reason: "invalid_avatar" };
  }

  try {
    const row = await prisma.checkIn.create({
      data: { communityId: community.id, name, xHandle, role, avatarUrl },
    });
    const memberNo = await prisma.checkIn.count({
      where: { communityId: community.id, createdAt: { lte: row.createdAt } },
    });
    return { ok: true, member: toCheckInRecord(row, memberNo) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "already_member" };
    }
    throw err;
  }
}

// Every member card made with this X handle, across all communities, with the
// community template each one renders in — shown on the profile of the wallet
// whose profile links that handle.
export async function listCardsByHandle(rawHandle: string): Promise<{ community: CommunityRecord; member: CheckInRecord }[]> {
  const xHandle = normalizeXHandle(rawHandle);
  if (!HANDLE_RE.test(xHandle)) return [];

  const rows = await prisma.checkIn.findMany({
    where: { xHandle },
    include: { community: { include: withCount } },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return [];

  const communities = await toCommunityRecords(rows.map((row) => row.community));
  return Promise.all(
    rows.map(async (row, i) => {
      const memberNo = await prisma.checkIn.count({
        where: { communityId: row.communityId, createdAt: { lte: row.createdAt } },
      });
      return { community: communities[i], member: toCheckInRecord(row, memberNo) };
    })
  );
}
