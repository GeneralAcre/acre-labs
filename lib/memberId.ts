// Card "No:" label — the first two letters/digits of the community name plus
// the member's 4-digit join position, e.g. "TE-0001" for the first member of
// Team1 Thailand. Shared by the server (which assigns positions) and the card.
export function memberIdLabel(communityName: string, memberNo: number): string {
  const prefix = (communityName.replace(/[^a-z0-9]/gi, "").slice(0, 2) || "XX").toUpperCase().padEnd(2, "X");
  return `${prefix}-${String(memberNo).padStart(4, "0")}`;
}
