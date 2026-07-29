import { NextRequest, NextResponse } from "next/server";
import { createEvent, getClaimCount, listEventsByOwner } from "@/lib/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

function requireOwner(request: NextRequest): string | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// imageUrl is embedded directly in the on-chain metadata JSON served from
// /api/metadata/[eventId] — an oversized payload risks wallets/marketplaces
// timing out when fetching tokenURI. The client already compresses uploads
// well under this, but the API is a real trust boundary, so it's enforced
// here too rather than relying on the client alone.
const MAX_IMAGE_DATA_URL_BYTES = 1024 * 1024;

// Organizer-only view — includes each drop's secretCode, so it's scoped to
// the signed-in wallet's own drops rather than listing every drop ever
// created (which used to leak every organizer's claim codes to anyone).
export async function GET(request: NextRequest) {
  const owner = requireOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to view your drops" }, { status: 401 });
  }

  const events = await listEventsByOwner(owner);
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => ({
      ...event,
      claimedCount: await getClaimCount(event.id),
    }))
  );
  return NextResponse.json({ events: eventsWithCounts });
}

export async function POST(request: NextRequest) {
  const owner = requireOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to create a drop" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = body?.title;
  const description = body?.description;
  const location = body?.location;
  const eventEndTime = Number(body?.eventEndTime);
  const imageUrl = body?.imageUrl;
  const maxSupplyRaw = body?.maxSupply;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!Number.isFinite(eventEndTime)) {
    return NextResponse.json(
      { error: "eventEndTime is required" },
      { status: 400 }
    );
  }
  if (imageUrl !== undefined && typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl must be a string" }, { status: 400 });
  }
  if (typeof imageUrl === "string" && imageUrl.length > MAX_IMAGE_DATA_URL_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Please choose a smaller picture." },
      { status: 400 }
    );
  }
  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json({ error: "description must be a string" }, { status: 400 });
  }
  if (location !== undefined && typeof location !== "string") {
    return NextResponse.json({ error: "location must be a string" }, { status: 400 });
  }

  let maxSupply: number | undefined;
  if (maxSupplyRaw !== undefined && maxSupplyRaw !== null && maxSupplyRaw !== "") {
    const parsed = Number(maxSupplyRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "maxSupply must be a positive whole number" },
        { status: 400 }
      );
    }
    maxSupply = parsed;
  }

  const record = await createEvent({
    title: title.trim(),
    description: description ? String(description).trim() || undefined : undefined,
    location: location ? String(location).trim() || undefined : undefined,
    eventEndTime,
    imageUrl: imageUrl ? String(imageUrl).trim() || undefined : undefined,
    maxSupply,
    ownerAddress: owner,
  });

  return NextResponse.json({ event: record }, { status: 201 });
}
