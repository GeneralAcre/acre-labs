import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getProfile, upsertProfile } from "@/lib/profiles";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Public read — display names and linked X handles are shown on profiles
// and the leaderboard.
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "A valid wallet address is required" }, { status: 400 });
  }
  return NextResponse.json({ profile: await getProfile(address) });
}

// Owner-only write: the signed session cookie decides whose profile changes,
// never an address in the request body.
export async function PUT(request: NextRequest) {
  const owner = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to edit your profile" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName : "";
  const xHandle = typeof body?.xHandle === "string" ? body.xHandle : "";

  const result = await upsertProfile(owner, { displayName, xHandle });
  if (!result.ok) {
    const messages = {
      invalid_name: "Name must be 40 characters or fewer.",
      invalid_handle: "X handle must be 1–15 letters, numbers, or underscores.",
      handle_taken: "That X handle is already linked to another wallet.",
    } as const;
    return NextResponse.json(
      { error: messages[result.reason] },
      { status: result.reason === "handle_taken" ? 409 : 400 }
    );
  }
  return NextResponse.json({ profile: result.profile });
}
