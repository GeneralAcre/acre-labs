export interface EventRecord {
  id: string;
  // Human-readable public identifier used in claim URLs — the uuid `id`
  // above stays the stable internal reference for everything that actually
  // matters for claim logic (Postgres FK, on-chain voucher/hasClaimed key).
  slug: string;
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
