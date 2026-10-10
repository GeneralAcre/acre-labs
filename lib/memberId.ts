// Card "No:" label — the community's chosen 2-3 character prefix (or the
// first two letters/digits of its name) plus the member's 4-digit join
// position, e.g. "TE-0001" for the first member of Team1 Thailand. Shared by
// the server (which assigns positions) and the card.
export function memberIdLabel(communityName: string, memberNo: number, cardPrefix?: string | null): string {
  const prefix =
    normalizeCardPrefix(cardPrefix ?? "") ||
    (communityName.replace(/[^a-z0-9]/gi, "").slice(0, 2) || "XX").toUpperCase().padEnd(2, "X");
  return `${prefix}-${String(memberNo).padStart(4, "0")}`;
}

// Uppercase letters/digits only, at most 3; "" when nothing usable is left.
export function normalizeCardPrefix(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
}

export const CARD_PREFIX_RE = /^[A-Z0-9]{2,3}$/;
