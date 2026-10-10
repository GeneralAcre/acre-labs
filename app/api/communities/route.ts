import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { createCommunity, findCommunityNameClash, listCommunities } from "@/lib/communities";

// ?name=… checks whether a community name is still free (the create form
// asks while the creator types); otherwise lists every community.
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (name !== null) {
    return NextResponse.json({ takenBy: await findCommunityNameClash(name) });
  }
  return NextResponse.json({ communities: await listCommunities() });
}

const ERRORS = {
  invalid_name: "Community name is required (up to 60 characters).",
  invalid_description: "Description must be 280 characters or fewer.",
  invalid_image: "That logo image couldn't be used.",
  invalid_issue_date: "Date of issue must be a valid date.",
  invalid_card_prefix: "Card number prefix must be 2 or 3 letters or numbers.",
  invalid_card_image: "That card background image couldn't be used.",
  name_taken: "A community or event with this name already exists.",
  invalid_place: "Place must be 80 characters or fewer.",
} as const;

// Creating a community needs a signed wallet session so the creator shown
// on the community is real; joining one (members route) does not.
export async function POST(request: NextRequest) {
  const owner = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to create a community" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await createCommunity(owner, {
    name: typeof body?.name === "string" ? body.name : "",
    description: typeof body?.description === "string" ? body.description : "",
    imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl : undefined,
    cardColor: typeof body?.cardColor === "string" ? body.cardColor : undefined,
    accentColor: typeof body?.accentColor === "string" ? body.accentColor : undefined,
    issueDate: typeof body?.issueDate === "string" ? body.issueDate : undefined,
    cardPrefix: typeof body?.cardPrefix === "string" ? body.cardPrefix : undefined,
    cardImage: typeof body?.cardImage === "string" ? body.cardImage : undefined,
    kind: typeof body?.kind === "string" ? body.kind : undefined,
    place: typeof body?.place === "string" ? body.place : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ error: ERRORS[result.reason] }, { status: result.reason === "name_taken" ? 409 : 400 });
  }
  return NextResponse.json({ community: result.community }, { status: 201 });
}
