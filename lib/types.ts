// Which project on the site a drop belongs to — Badge (general proof of
// attendance) and Content (hackathon passes) share the same claim/mint
// mechanics but are browsed and created as separate products.
export type Product = "badge" | "content";

export interface EventRecord {
  id: string;
  // Human-readable public identifier used in claim URLs — the uuid `id`
  // above stays the stable internal reference for everything that actually
  // matters for claim logic (Postgres FK, on-chain voucher/hasClaimed key).
  slug: string;
  product: Product;
  title: string;
  description?: string;
  location?: string;
  contractAddress: string;
  // Tx that deployed this drop's own clone contract — absent for historic
  // rows created before the factory/clone migration, which all share
  // SHARED_DROP_CONTRACT_ADDRESS instead.
  deployTxHash?: string;
  secretCode: string;
  eventEndTime: number;
  expiresAt: number;
  createdAt: number;
  imageUrl?: string;
  maxSupply?: number;
  ownerAddress: string;
}

export type PublicEvent = Omit<EventRecord, "secretCode" | "ownerAddress">;

// Claim count is derived from the claims store rather than stored on the
// record itself, so it's only attached to API responses that need it.
export type PublicEventWithSupply = PublicEvent & { claimedCount: number };

// A claim starts "pending" the moment a code is validated — before the
// on-chain mint even happens — so the maxSupply/duplicate checks have
// something to count immediately instead of racing the (much slower,
// asynchronous) on-chain confirmation. It only becomes "confirmed" once
// the mint transaction is verified on-chain.
export interface ClaimRecord {
  eventId: string;
  walletAddress: string;
  status: "pending" | "confirmed";
  txHash: string | null;
  tokenId: string | null;
  reservedAt: number;
  claimedAt: number | null;
}

export interface CollectedClaim {
  eventId: string;
  walletAddress: string;
  txHash: string;
  tokenId: string | null;
  claimedAt: number;
  event: PublicEvent;
}

// A community on Content, with its creator resolved to a display name
// (their profile name, else a shortened address; "AcreLabs" for the original
// Team1 Thailand wall, which has no wallet owner).
// What a community's cards are: member ID cards, or passes for one event.
export type CardKind = "community" | "event";

export interface CommunityRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  // ID card template colors (#rrggbb).
  cardColor: string;
  accentColor: string;
  // "Date of issue" on member cards (ms); null = each member's own join date.
  issueDate: number | null;
  // "No:" prefix on member cards; null = first two letters of the name.
  cardPrefix: string | null;
  // Card background picture (data: URI); null = plain cardColor.
  cardImage: string | null;
  kind: CardKind;
  // Event venue (event cards only).
  place: string | null;
  ownerAddress: string | null;
  creatorName: string;
  memberCount: number;
  createdAt: number;
}

// One member card in a community — name, X handle and an optional profile
// picture, no wallet involved.
export interface CheckInRecord {
  id: string;
  name: string;
  xHandle: string;
  avatarUrl: string | null;
  role: string | null;
  // 1-based position in the community by join order — shown on the card as
  // e.g. "TE-0001".
  memberNo: number;
  createdAt: number;
}

// A wallet's self-chosen identity. displayName replaces the shortened
// address wherever the wallet is shown; xHandle links its Content member card.
export interface ProfileRecord {
  address: string;
  displayName: string | null;
  xHandle: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string | null;
  xHandle: string | null;
  badges: number;
  memberCards: number;
  points: number;
  level: number;
  name: string;
  lastActiveAt: number | null;
}

// One on-chain mint of a drop, as shown in a badge's holders table.
export interface BadgeHolder {
  address: string;
  displayName: string | null;
  tokenId: string;
  txHash: string;
  mintedAt: number;
}
