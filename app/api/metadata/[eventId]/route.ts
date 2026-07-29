import { NextResponse } from "next/server";
import { getEvent, toPublicEvent } from "@/lib/store";

// Public, unauthenticated ERC721 metadata endpoint — this is what
// EventDrop.sol's tokenURI() points wallets/marketplaces at
// (`baseURI + eventId`). Replaces the old contract's tokenURI(), which
// always returned "" (every minted NFT showed up blank everywhere).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const record = await getEvent(eventId);

  if (!record) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const event = toPublicEvent(record);

  return NextResponse.json({
    name: event.title,
    description:
      event.description ?? `Proof of attendance for ${event.title}, minted on Avalanche.`,
    image: event.imageUrl,
    attributes: [
      { trait_type: "Event", value: event.title },
      { trait_type: "Claim window closed", value: new Date(event.expiresAt).toISOString() },
    ],
  });
}
