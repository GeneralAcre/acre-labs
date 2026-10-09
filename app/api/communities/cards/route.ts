import { NextRequest, NextResponse } from "next/server";
import { listCardsByHandle } from "@/lib/communities";

// Public: the member cards made with an X handle (used on profiles).
export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("handle") ?? "";
  return NextResponse.json({ cards: await listCardsByHandle(handle) });
}
