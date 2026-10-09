import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard";
import { syncMintsIfStale } from "@/lib/mintSync";

export async function GET() {
  // Pick up any on-chain mint whose confirmation never reached the server
  // before ranking (throttled — usually a no-op).
  await syncMintsIfStale();
  return NextResponse.json({ entries: await getLeaderboard() });
}
