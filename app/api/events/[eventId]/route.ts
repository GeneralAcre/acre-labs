import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, toPublicEventWithSupply, updateEvent } from "@/lib/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

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

// Unlike GET above, this is the organizer-only edit path — the dashboard
// passes the internal uuid `id` here (what GET /api/events returns), not the
// public slug.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const owner = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to edit a drop" }, { status: 401 });
  }

  const { eventId: id } = await params;
  const body = await request.json().catch(() => null);
  const expiresAt = Number(body?.expiresAt);
  if (!Number.isFinite(expiresAt)) {
    return NextResponse.json({ error: "expiresAt is required" }, { status: 400 });
  }

  const updated = await updateEvent(id, owner, { expiresAt });
  if (!updated) {
    return NextResponse.json({ error: "Drop not found" }, { status: 404 });
  }

  return NextResponse.json({ event: updated });
}
