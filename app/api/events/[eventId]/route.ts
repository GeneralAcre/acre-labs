import { NextResponse } from "next/server";
import { getEventBySlug, toPublicEventWithSupply } from "@/lib/store";

// The dynamic segment here is the event's public slug (e.g.
// "avalanche-summit-afterparty-482917"), not the internal uuid `id` — the
// folder's still named [eventId] to avoid an unrelated file-move, but the
// value it receives from /claim/[eventId]'s route param is a slug.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: slug } = await params;
  const record = await getEventBySlug(slug);

  if (!record) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // secretCode is intentionally stripped before this reaches the attendee's browser.
  return NextResponse.json({ event: await toPublicEventWithSupply(record) });
}
