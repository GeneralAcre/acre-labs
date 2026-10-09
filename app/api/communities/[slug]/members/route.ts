import { NextRequest, NextResponse } from "next/server";
import { joinCommunity } from "@/lib/communities";

const ERRORS = {
  not_found: { message: "Community not found.", status: 404 },
  invalid_name: { message: "Enter your name (up to 60 characters).", status: 400 },
  invalid_handle: {
    message: "Enter a valid X handle (letters, numbers, underscore — up to 15 characters).",
    status: 400,
  },
  invalid_role: { message: "Role must be 30 characters or fewer.", status: 400 },
  invalid_avatar: { message: "That picture couldn't be used — try a smaller image.", status: 400 },
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
  });
  if (!result.ok) {
    const { message, status } = ERRORS[result.reason];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ member: result.member }, { status: 201 });
}
