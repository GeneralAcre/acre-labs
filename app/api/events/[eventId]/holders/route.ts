import { NextResponse } from "next/server";
import { getBadgeHolders } from "@/lib/holders";

// Public: who minted this drop, read from the chain. Keyed by the event's
// uuid (the claim page already has it from GET /api/events/[slug]).
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const holders = await getBadgeHolders(eventId);
  if (!holders) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ holders });
}
