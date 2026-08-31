import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, toPublicEventWithSupply, updateEvent } from "@/lib/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const MAX_SUPPLY_CAP = 200;

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
  const input: { expiresAt?: number; maxSupply?: number } = {};

  if (body?.expiresAt !== undefined) {
    const expiresAt = Number(body.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return NextResponse.json({ error: "expiresAt must be a valid timestamp" }, { status: 400 });
    }
    input.expiresAt = expiresAt;
  }

  if (body?.maxSupply !== undefined) {
    const maxSupply = Number(body.maxSupply);
    if (!Number.isInteger(maxSupply) || maxSupply < 1 || maxSupply > MAX_SUPPLY_CAP) {
      return NextResponse.json(
        { error: `maxSupply must be a whole number between 1 and ${MAX_SUPPLY_CAP}` },
        { status: 400 }
      );
    }
    input.maxSupply = maxSupply;
  }

  if (input.expiresAt === undefined && input.maxSupply === undefined) {
    return NextResponse.json({ error: "Provide a claim deadline or max supply" }, { status: 400 });
  }

  const updated = await updateEvent(id, owner, input);
  if (!updated) {
    return NextResponse.json(
      { error: "Drop not found, or its claimed badges exceed the requested supply" },
      { status: 409 }
    );
  }

  return NextResponse.json({ event: updated });
}
