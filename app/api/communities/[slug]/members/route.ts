import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { MAX_MEMBER_NO, joinCommunity } from "@/lib/communities";
import { linkHandleIfUnset } from "@/lib/profiles";

const ERRORS = {
  not_found: { message: "Community not found.", status: 404 },
  invalid_name: { message: "Enter your name (up to 60 characters).", status: 400 },
  invalid_handle: {
    message: "Enter a valid X handle (letters, numbers, underscore — up to 15 characters).",
    status: 400,
  },
  invalid_role: { message: "Role must be 30 characters or fewer.", status: 400 },
  invalid_avatar: { message: "That picture couldn't be used — try a smaller image.", status: 400 },
  invalid_member_no: { message: `Pick a card number from 1 to ${MAX_MEMBER_NO}.`, status: 400 },
  member_no_taken: { message: "That card number is already taken — pick another one.", status: 409 },
  already_member: { message: "That X handle already has a card in this community.", status: 409 },
} as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string" || typeof body?.xHandle !== "string") {
    return NextResponse.json({ error: "name and xHandle are required" }, { status: 400 });
  }

  const result = await joinCommunity(slug, {
    name: body.name,
    xHandle: body.xHandle,
    role: typeof body.role === "string" ? body.role : null,
    avatarUrl: typeof body.avatarUrl === "string" ? body.avatarUrl : null,
    memberNo: Number(body.memberNo),
  });
  if (!result.ok) {
    const { message, status } = ERRORS[result.reason];
    return NextResponse.json({ error: message }, { status });
  }

  // No wallet is needed to make a card, but if the maker is signed in, link
  // the card's handle to their profile so it shows up there.
  const owner = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (owner) await linkHandleIfUnset(owner, result.member.xHandle);

  return NextResponse.json({ member: result.member }, { status: 201 });
}
