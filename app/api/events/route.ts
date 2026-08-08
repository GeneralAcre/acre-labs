import { NextRequest, NextResponse } from "next/server";
import { createEvent, getClaimCount, listEventsByOwner } from "@/lib/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isGenuineDropClone } from "@/lib/web3/verifyClone";

function requireOwner(request: NextRequest): string | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// imageUrl is embedded directly in the on-chain metadata JSON served from
// /api/metadata/[eventId] — an oversized payload risks wallets/marketplaces
// timing out when fetching tokenURI. The client already compresses uploads
// well under this, but the API is a real trust boundary, so it's enforced
// here too rather than relying on the client alone.
const MAX_IMAGE_DATA_URL_BYTES = 1024 * 1024;

const MAX_SUPPLY_CAP = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

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
  const id = body?.id;
  const contractAddress = body?.contractAddress;
  const deployTxHash = body?.deployTxHash;
  const title = body?.title;
  const description = body?.description;
  const location = body?.location;
  const eventEndTime = Number(body?.eventEndTime);
  const imageUrl = body?.imageUrl;
  const maxSupplyRaw = body?.maxSupply;

  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "id must be a valid client-generated uuid" }, { status: 400 });
  }
  if (typeof contractAddress !== "string" || !ADDRESS_RE.test(contractAddress)) {
    return NextResponse.json({ error: "contractAddress must be a valid contract address" }, { status: 400 });
  }
  if (deployTxHash !== undefined && (typeof deployTxHash !== "string" || !TX_HASH_RE.test(deployTxHash))) {
    return NextResponse.json({ error: "deployTxHash must be a valid transaction hash" }, { status: 400 });
  }

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!Number.isFinite(eventEndTime)) {
    return NextResponse.json(
      { error: "eventEndTime is required" },
      { status: 400 }
    );
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }
  if (imageUrl.length > MAX_IMAGE_DATA_URL_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Please choose a smaller picture." },
      { status: 400 }
    );
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (typeof location !== "string" || !location.trim()) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }

  if (maxSupplyRaw === undefined || maxSupplyRaw === null || maxSupplyRaw === "") {
    return NextResponse.json({ error: "maxSupply is required" }, { status: 400 });
  }
  const maxSupply = Number(maxSupplyRaw);
  if (!Number.isInteger(maxSupply) || maxSupply < 1 || maxSupply > MAX_SUPPLY_CAP) {
    return NextResponse.json(
      { error: `maxSupply must be a whole number between 1 and ${MAX_SUPPLY_CAP}` },
      { status: 400 }
    );
  }

  const isGenuine = await isGenuineDropClone(contractAddress);
  if (!isGenuine) {
    return NextResponse.json(
      { error: "contractAddress doesn't look like a drop contract deployed by AcreLabs' factory." },
      { status: 400 }
    );
  }

  const record = await createEvent({
    id,
    contractAddress,
    deployTxHash: typeof deployTxHash === "string" ? deployTxHash : undefined,
    title: title.trim(),
    description: description.trim(),
    location: location.trim(),
    eventEndTime,
    imageUrl: imageUrl.trim(),
    maxSupply,
    ownerAddress: owner,
  });

  return NextResponse.json({ event: record }, { status: 201 });
}
