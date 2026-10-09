import { NextRequest, NextResponse } from "next/server";
import { getCommunityBySlug } from "@/lib/communities";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCommunityBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
