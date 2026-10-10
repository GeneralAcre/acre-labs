import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { findMyCardId, getCommunityBySlug } from "@/lib/communities";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCommunityBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }
  // Lets the page show a signed-in visitor their existing card instead of the form.
  const viewer = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const myCardId = viewer ? await findMyCardId(slug, viewer) : null;
  return NextResponse.json({ ...result, myCardId });
}
