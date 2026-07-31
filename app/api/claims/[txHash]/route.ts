import { NextResponse } from "next/server";
import { getClaimByTxHash } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const { txHash } = await params;
  const claim = await getClaimByTxHash(txHash);

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  return NextResponse.json({ claim });
}
